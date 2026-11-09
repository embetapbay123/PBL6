import {Button as UiButton} from '../../components/ui/Button';
import { Modal } from "../../components/Modal";
import { useConfirm } from "../../components/ConfirmDialog";
import { useUnsavedChanges } from "../../components/useUnsavedChanges";
import { FormEvent, useState } from "react";
import type {
  OperationInputs,
  OperationOutputs,
} from "../../api/operations.generated";
import { callOperation } from "../../api/operations";
import { ApiError } from "../../api/client";
import { ErrorView } from "../../bootstrap/components";
type ProductType = OperationOutputs["listProductTypes"]["items"][number];
type Definition = NonNullable<ProductType["attribute_definitions"]>[number];
type DataType =
  OperationInputs["createAttributeDefinition"]["body"]["data_type"];
export function AttributeDefinitions({
  types,
  reload,
}: {
  types: ProductType[];
  reload: () => Promise<void>;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [typeId, setTypeId] = useState(""),
    [definitionId, setDefinitionId] = useState("");
  const definitions =
      types.find((type) => type.id === typeId)?.attribute_definitions ?? [],
    definition = definitions.find((row) => row.id === definitionId);
  return (
    <section aria-label="Định nghĩa thuộc tính">
      <h4>Thuộc tính loại sản phẩm</h4>
      <label>
        Loại sản phẩm chứa thuộc tính
        <select
          aria-label="Loại sản phẩm chứa thuộc tính"
          value={typeId}
          onChange={(event) => {
            setFormOpen(false);
            setTypeId(event.target.value);
            setDefinitionId("");
          }}
        >
          <option value="">Chọn loại sản phẩm</option>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </label>
      {typeId && (
        <>
          <label>
            Thuộc tính cần sửa
            <select
              aria-label="Thuộc tính cần sửa"
              value={definitionId}
              onChange={(event) => {
                setDefinitionId(event.target.value);
                if (event.target.value) setFormOpen(true);
              }}
            >
              <option value="">Chọn thuộc tính để xem</option>
              {definitions.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} ({row.code})
                </option>
              ))}
            </select>
          </label>
          {definition && (
            <dl className="read-only-fields">
              <div>
                <dt>Thuộc tính</dt>
                <dd>
                  {definition.name} · {definition.code}
                </dd>
              </div>
              <div>
                <dt>Kiểu / giá trị</dt>
                <dd>
                  {definition.data_type} ·{" "}
                  {definition.allowed_values?.join(", ") ||
                    "Không giới hạn danh sách"}
                </dd>
              </div>
            </dl>
          )}
          <div className="ui-actions">
            <button
              type="button"
              onClick={() => {
                setDefinitionId("");
                setFormOpen(true);
              }}
            >
              Tạo thuộc tính mới
            </button>
            {definition && (
              <button type="button" onClick={() => setFormOpen(true)}>
                Sửa thuộc tính
              </button>
            )}
          </div>
          {formOpen && (
            <DefinitionForm
              key={
                typeId +
                ":" +
                (definition?.id ?? "new") +
                ":" +
                definition?.version
              }
              typeId={typeId}
              definition={definition}
              reload={reload}
              close={() => setFormOpen(false)}
            />
          )}
        </>
      )}
    </section>
  );
}
function DefinitionForm({
  typeId,
  definition,
  reload,
  close,
}: {
  close: () => void;
  typeId: string;
  definition?: Definition;
  reload: () => Promise<void>;
}) {
  const [name, setName] = useState(definition?.name ?? ""),
    [code, setCode] = useState(definition?.code ?? ""),
    [dataType, setDataType] = useState(definition?.data_type ?? "STRING"),
    [required, setRequired] = useState(definition?.required ?? false),
    [axis, setAxis] = useState(definition?.variant_axis ?? false),
    [unit, setUnit] = useState(definition?.unit ?? ""),
    [options, setOptions] = useState(
      definition?.allowed_values?.join("\n") ?? "",
    );
  const { confirm, dialog } = useConfirm();
  const [optionDraft, setOptionDraft] = useState("");
  const dirty =
    JSON.stringify([name, code, dataType, required, axis, unit, options]) !==
    JSON.stringify([
      definition?.name ?? "",
      definition?.code ?? "",
      definition?.data_type ?? "STRING",
      definition?.required ?? false,
      definition?.variant_axis ?? false,
      definition?.unit ?? "",
      definition?.allowed_values?.join("\n") ?? "",
    ]);
  useUnsavedChanges(dirty);
  async function cancel() {
    if (busy || blocked) return;
    if (
      dirty &&
      !(await confirm({
        title: "Bỏ thay đổi thuộc tính?",
        description: "Các thay đổi chưa lưu sẽ bị bỏ.",
        confirmLabel: "Bỏ bản nháp",
      }))
    )
      return;
    close();
  }
  const [busy, setBusy] = useState(false),
    [blocked, setBlocked] = useState(false),
    [error, setError] = useState<unknown>();
  const missingVersion = !!definition && definition.version === undefined;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || blocked || missingVersion) return;
    setBusy(true);
    setError(undefined);
    const values = {
      name: name.trim(),
      data_type: dataType,
      required,
      variant_axis: axis,
      unit: unit.trim(),
      allowed_values: [
        ...new Set(
          options
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ],
    };
    try {
      if (!["STRING", "TEXT", "NUMBER", "BOOLEAN"].includes(dataType))
        throw new ApiError(
          422,
          "VALIDATION_FAILED",
          "Chọn kiểu dữ liệu được hỗ trợ.",
        );
      if (values.allowed_values.length > 100)
        throw new ApiError(
          422,
          "VALIDATION_FAILED",
          "Tối đa 100 giá trị lựa chọn.",
        );
      if (definition)
        await callOperation("updateAttributeDefinition", {
          path: { id: definition.id },
          body: { ...values, expected_version: definition.version! },
        });
      else
        await callOperation("createAttributeDefinition", {
          body: {
            ...values,
            data_type: dataType as DataType,
            code: code.trim(),
            product_type_id: typeId,
          },
        });
      await reload();
      close();
    } catch (e) {
      setError(e);
      if (e instanceof ApiError && (e.status === 0 || e.status === 409))
        setBlocked(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {dialog}
      <Modal
        label={definition ? "Sửa thuộc tính" : "Tạo thuộc tính mới"}
        busy={busy || blocked}
        onClose={() => void cancel()}
      >
        <form onSubmit={submit}>
          <fieldset disabled={busy || blocked || missingVersion}>
            <legend>{definition ? "Sửa thuộc tính" : "Tạo thuộc tính"}</legend>
            <label>
              Tên thuộc tính
              <input
                required
                maxLength={200}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label>
              Mã thuộc tính
              <input
                required
                maxLength={200}
                pattern="[a-zA-Z][a-zA-Z0-9_]*"
                readOnly={!!definition}
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </label>
            {definition && (
              <p>
                Mã thuộc tính là định danh cố định, không thể đổi sau khi tạo.
              </p>
            )}
            <label>
              Kiểu dữ liệu
              <select
                value={dataType}
                onChange={(event) => setDataType(event.target.value)}
              >
                {["STRING", "TEXT", "NUMBER", "BOOLEAN"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              Đơn vị
              <input
                maxLength={200}
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={required}
                onChange={(event) => setRequired(event.target.checked)}
              />
              Bắt buộc nhập
            </label>
            <label>
              <input
                type="checkbox"
                checked={axis}
                onChange={(event) => setAxis(event.target.checked)}
              />
              Phân biệt biến thể
            </label>
            <div className="allowed-values-editor">
              <label>
                Thêm giá trị cho phép
                <input
                  maxLength={200}
                  value={optionDraft}
                  onChange={(e) => setOptionDraft(e.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={
                  !optionDraft.trim() ||
                  options.split("\n").filter(Boolean).length >= 100
                }
                onClick={() => {
                  setOptions(
                    [
                      ...new Set([
                        ...options.split("\n").filter(Boolean),
                        optionDraft.trim(),
                      ]),
                    ].join("\n"),
                  );
                  setOptionDraft("");
                }}
              >
                Thêm giá trị
              </button>
              <ul>
                {options
                  .split("\n")
                  .filter(Boolean)
                  .map((value) => (
                    <li key={value}>
                      <span>{value}</span>
                      <button
                        type="button"
                        aria-label={"Xóa giá trị " + value}
                        onClick={() =>
                          setOptions(
                            options
                              .split("\n")
                              .filter((v) => v !== value)
                              .join("\n"),
                          )
                        }
                      >
                        ×
                      </button>
                    </li>
                  ))}
              </ul>
              <p>Để trống nếu không giới hạn danh sách. Tối đa 100 giá trị.</p>
            </div>
            <button disabled={!name.trim() || !code.trim()}>
              {busy
                ? "Đang lưu…"
                : definition
                  ? "Lưu thuộc tính"
                  : "Tạo thuộc tính"}
            </button>
          </fieldset>
          <UiButton
            type="button"
            variant="secondary"
            disabled={busy || blocked}
            onClick={() => void cancel()}
          >
            Hủy
          </UiButton>
          {error !== undefined && <ErrorView error={error} />}{" "}
          {(blocked || missingVersion) && (
            <p>
              Cần tải lại taxonomy trước khi lưu tiếp. Việc tải lại sẽ bỏ nội
              dung chưa lưu.
            </p>
          )}
        </form>
      </Modal>
    </>
  );
}
