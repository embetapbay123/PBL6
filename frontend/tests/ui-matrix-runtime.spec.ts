import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { seededMarket } from "./runtime/seeded-market";
test.skip(
  process.env.CORE_FIX_UI_MATRIX !== "1",
  "Private tagged pbl6-fe-verify only.",
);
test.use({ viewport: { width: 1440, height: 900 } });
test("twelve-variant UI matrix commits required taxonomy attributes and twelve zero-stock rows in real QA", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const f = seededMarket("corecheckout", { verified: true }),
    actor = await f.actor("ui-matrix"),
    admin = (
      await f.api("/auth/login", undefined, "POST", {
        email: "admin@pbl6.test",
        password: process.env.SEED_PASSWORD,
        client_type: "MOBILE",
      })
    ).access_token;
  let access = actor.access,
    category: any,
    type: any,
    product: any;
  try {
    const app = await f.api("/me/store-applications", access, "POST", {
      proposed_name: f.tag + " Matrix",
      contact: actor.email,
    });
    await f.api("/admin/store-applications/" + app.id, admin, "PATCH", {
      status: "APPROVED",
      expected_version: app.version,
    });
    access = (
      await f.api("/auth/login", undefined, "POST", {
        email: actor.email,
        password: f.password,
        client_type: "MOBILE",
      })
    ).access_token;
    category = await f.api("/admin/categories", admin, "POST", {
      name: f.tag + " Matrix",
    });
    type = await f.api("/admin/product-types", admin, "POST", {
      name: f.tag + " Matrix",
      category_id: category.id,
    });
    for (const d of [
      { code: "color", name: "Màu sắc", allowed_values: ["Đỏ", "Xanh", "Đen"] },
      { code: "size", name: "Kích cỡ", allowed_values: ["S", "M", "L", "XL"] },
    ])
      await f.api("/admin/attribute-definitions", admin, "POST", {
        ...d,
        product_type_id: type.id,
        data_type: "STRING",
        required: true,
        variant_axis: true,
      });
    try {
      await f.login(page, actor.email);
    } finally {
      await page
        .evaluate(() =>
          document
            .querySelectorAll<HTMLInputElement>('input[type="password"]')
            .forEach((input) => {
              input.value = "";
            }),
        )
        .catch(() => {});
    }
    await page.goto("/seller/products", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("button", { name: "Thêm sản phẩm mới", exact: true })
      .click();
    const dialog = page.getByRole("dialog", { name: "Thêm sản phẩm mới" });
    await dialog
      .getByRole("combobox", { name: "Loại sản phẩm *", exact: true })
      .selectOption(type.id);
    await dialog.getByLabel("Tạo nhiều phân loại theo ma trận").check();
    await dialog
      .getByLabel("Tên sản phẩm *", { exact: true })
      .fill(f.tag + " Áo ma trận");
    await dialog
      .getByLabel("Tiền tố SKU cho các tổ hợp *", { exact: true })
      .fill(f.tag);
    const matrix = dialog.getByRole("region", { name: "Ma trận phân loại" });
    await matrix.getByLabel("Màu sắc", { exact: false }).fill("Đỏ, Xanh, Đen");
    await matrix.getByLabel("Kích cỡ", { exact: false }).fill("S, M, L, XL");
    await matrix
      .getByRole("button", { name: "Xem trước tổ hợp", exact: true })
      .click();
    await expect(matrix.locator("tbody tr")).toHaveCount(12);
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/v1/store/products") &&
        r.request().method() === "POST",
    );
    await dialog
      .getByRole("button", { name: "Tạo sản phẩm", exact: true })
      .click();
    const created = await response;
    expect(created.status()).toBe(201);
    product = await created.json();
    await expect(dialog).toHaveCount(0);
    expect(product.status).toBe("DRAFT");
    expect(product.attributes).toMatchObject({ color: "Đỏ", size: "S" });
    expect(product.variants).toHaveLength(12);
    expect(product.variants.filter((v: any) => v.is_default)).toHaveLength(1);
    const inventory = await f.api(
      "/store/inventory?product_id=" + product.id,
      access,
    );
    expect(inventory.items).toHaveLength(12);
    for (const row of inventory.items)
      expect(row).toMatchObject({
        quantity: 0,
        reserved_quantity: 0,
        available_quantity: 0,
      });
    const sql = `const {Client}=require('pg');(async()=>{let t='';for await(const b of process.stdin)t+=b;const x=JSON.parse(t);if(!/^corecheckout-[0-9]+$/.test(x.tag))throw Error('Tagged data only');const c=new Client({connectionString:process.env.M1_DATABASE_URL});await c.connect();try{const p=await c.query('SELECT status,attributes_json FROM product WHERE id=$1 AND title=$2',[x.id,x.title]);const v=await c.query('SELECT count(*)::int AS count FROM product_variant WHERE product_id=$1',[x.id]);process.stdout.write(JSON.stringify({product:p.rows[0],variants:v.rows[0].count}));}finally{await c.end();}})();`;
    const db = JSON.parse(
      execFileSync(
        "docker",
        ["exec", "-i", "pbl6-fe-verify-m1-1", "node", "-e", sql],
        {
          input: JSON.stringify({
            tag: f.tag,
            id: product.id,
            title: product.title,
          }),
          encoding: "utf8",
        },
      ),
    );
    expect(db.variants).toBe(12);
    expect(db.product.status).toBe("DRAFT");
    expect(db.product.attributes_json).toMatchObject({
      color: "Đỏ",
      size: "S",
    });
    writeFileSync(
      info.outputPath("matrix-checkpoints.json"),
      JSON.stringify(
        {
          tag: f.tag,
          evidence: "REAL_UI_API_DATABASE",
          product_id: product.id,
          status: product.status,
          variants: product.variants.length,
          zero_stock_rows: inventory.items.length,
          db,
        },
        null,
        2,
      ),
    );
  } finally {
    if (product) {
      const current = await f.api("/store/products/" + product.id, access);
      await f.api("/store/products/" + product.id, access, "PATCH", {
        expected_version: current.version,
        status: "STOPPED",
      });
    }
    if (type && category) {
      const cleanup = `const {Client}=require('pg');(async()=>{let t='';for await(const b of process.stdin)t+=b;const x=JSON.parse(t);if(!/^corecheckout-[0-9]+$/.test(x.tag))throw Error('Tagged data only');const c=new Client({connectionString:process.env.M1_DATABASE_URL});await c.connect();try{await c.query('BEGIN');await c.query("UPDATE product_type SET status='STOPPED',version=version+1 WHERE id=$1 AND name=$2",[x.type,x.tag+' Matrix']);await c.query("UPDATE category SET status='STOPPED',version=version+1 WHERE id=$1 AND name=$2",[x.category,x.tag+' Matrix']);await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{await c.end();}})();`;
      execFileSync(
        "docker",
        ["exec", "-i", "pbl6-fe-verify-m1-1", "node", "-e", cleanup],
        {
          input: JSON.stringify({
            tag: f.tag,
            type: type.id,
            category: category.id,
          }),
          encoding: "utf8",
        },
      );
    }
  }
});
