"""Build a deliberately curated catalog and download its individual Burst photos."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib, html, io, json, re, urllib.request
from PIL import Image, ImageOps, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/catalog-refresh-2026-11-14'
ROWS='''AN|Quần jeans trẻ em xanh denim|childrens-fashion-jeans|kids|289000|Xanh denim
AN|Áo khoác denim cổ bẻ|man-unbuttoning-jean-jacket|top|649000|Xanh denim
AN|Sơ mi caro đỏ đen|red-plaid-shirt|top|329000|Đỏ đen
AN|Áo dài tay đen cổ tròn|long-sleeved-back-shirt|top|229000|Đen
AN|Áo khoác gió navy khóa kéo|navy-blue-zip-up-jacket|top|559000|Xanh navy
AN|Áo măng tô be dáng dài|man-poses-in-light-colored-overcoat|top|1190000|Be
AN|Quần short đi biển xanh ngọc|swim-shorts|shorts|249000|Xanh ngọc
AN|Mũ lưỡi trai vàng mustard|tan-colored-hat-on-monochrome-background|hat|189000|Vàng mustard
AN|Giày thể thao đen viền trắng|pair-of-black-and-white-sneakers|shoe|599000|Đen trắng
AN|Giày skate xanh navy đế bằng|pair-of-navy-blue-skate-shoes|shoe|629000|Xanh navy
AN|Giày trekking cổ cao nâu|rugged-hiking-boots-stood-on-rocks|shoe|1290000|Nâu
AN|Giày cao cổ đỏ có đèn|red-led-high-top-sneakers|shoe|749000|Đỏ
NEP|Đầm đen ánh kim dự tiệc|shiny-black-cocktail-dress|dress|799000|Đen ánh kim
NEP|Đầm chấm bi dáng xòe|polka-dot-summer-dress|dress|459000|Chấm bi
NEP|Váy quả cherry cho bé|toddler-cherry-dress|kids|249000|Họa tiết cherry
NEP|Đầm đỏ trễ vai|off-shoulder-red-cocktail-dress|dress|699000|Đỏ
NEP|Đầm xanh trễ vai|off-shoulder-green-dress|dress|599000|Xanh lá
NEP|Váy navy chấm bi trắng|navy-and-white-dress|dress|449000|Xanh navy trắng
NEP|Khăn choàng phối xám cam đào|grey-and-peach-scarf-product|hat|189000|Xám cam đào
NEP|Váy boho dáng thoải mái|womens-boho-dress|dress|529000|Họa tiết boho
NEP|Đầm hoa đi dạo|floral-sun-dress|dress|489000|Họa tiết hoa
NEP|Váy sọc cho bé gái|girls-striped-dress|kids|279000|Sọc
NEP|Áo khoác da cho bé|kids-leather-jacket|kids|449000|Đen
NEP|Giày mềm hình tim cho bé|baby-shoes|babyshoe|189000|Trung tính
MX|Bộ cọ trang điểm cán gọn|makeup-brushes-on-marble|beauty|179000|Trung tính
MX|Bộ bàn chải cán tre|wooden-toothbrushes-lined-on-bright-pink-background|beauty|69000|Tre tự nhiên
MX|Son dưỡng dạng thỏi|tube-of-lip-balm|beauty|79000|Trung tính
MX|Mặt nạ than hoạt tính dạng hũ|jar-of-activated-charcoal-facemask|beauty|139000|Đen
MX|Dầu dưỡng râu lọ nhỏ giọt|beard-oil-product-photo|beauty|159000|Hổ phách
MX|Viên tạo bọt bồn tắm xanh trắng|blue-and-white-bath-bombs|beauty|99000|Xanh trắng
MX|Bình nhấn đựng xà phòng trắng|white-pump-bottle-sits-on-a-white-porcelain-sink|household|129000|Trắng
MX|Kẹp giữ cà chua khi thái|vegetable-slicer-in-kitchen|kitchen|119000|Trung tính
MX|Dụng cụ cắt dưa hấu inox|watermelon-scooper|kitchen|59000|Inox
MX|Bình pha cà phê French press|mug-of-coffee-and-a-french-press-on-a-window-sill|kitchen|289000|Thủy tinh
MX|Tô gỗ trộn rau|knife-scraped-kale-into-wooden-bowl|kitchen|219000|Gỗ tự nhiên
MX|Dụng cụ bào tỏi cầm tay|garlic-grater-kitchen-tool|kitchen|79000|Trung tính
GOC|Nến đậu nành hũ nhỏ|mini-soy-candle|decor|129000|Trắng
GOC|Bình thủy tinh cắm cành dáng cao|flower-buds-on-a-branch-sit-in-a-jug-of-water|decor|249000|Trung tính
GOC|Đồ treo trang trí phòng em bé|handmade-baby-nursery-mobile|decor|219000|Tự nhiên
GOC|Đèn bàn tông đồng|copper-light-in-bedroom|lamp|689000|Đồng
GOC|Bàn đầu giường gỗ tròn|teak-headboard-table|furniture|1490000|Gỗ tự nhiên
GOC|Ghế ban công tựa thoải mái|patio-chair-on-balcony|furniture|1290000|Trung tính
GOC|Ghế tựa gỗ tối giản|bare-stony-room-with-two-wooden-benches-and-coffee-tables|furniture|1690000|Gỗ tự nhiên
GOC|Sofa xám ba chỗ|large-grey-sofa-by-brick-wall|furniture|6490000|Xám
GOC|Ghế bành hồng phấn phòng khách|blush-coloured-couch-with-blankets|furniture|5990000|Hồng phấn
GOC|Gối tựa vàng mustard|yellow-pillow-bedside-table|decor|169000|Vàng mustard
GOC|Bàn làm việc góc sáng|photo-of-a-desk-and-white-corner-seating-area|furniture|1890000|Trắng
GOC|Giỏ picnic đan có quai|wicker-picnic-basket-with-stemless-wine-glasses|decor|459000|Mây tự nhiên
MOC|Micro thu âm để bàn màu đen|black-microphone-against-orange-photo|tech|749000|Đen
MOC|Máy ảnh DSLR cho góc sáng tạo|product-photography-camera|tech|5490000|Đen
MOC|Máy ảnh mirrorless màu đen|vintage-film-camera-on-grey-background|tech|4290000|Đen
MOC|Laptop mỏng cho bàn làm việc|macbook-air-on-desk|tech|11990000|Bạc
MOC|Máy tính bảng xám tiện mang theo|tablet-coffee|tech|3990000|Xám
MOC|Ống kính rời cho máy ảnh|lenses-lattes|tech|1890000|Đen
MOC|Loa di động vàng nhỏ gọn|yellow-portable-speaker|tech|299000|Vàng
MOC|Cáp sạc Lightning bọc dù trắng|white-braided-iphone-cable|tech|119000|Trắng
MOC|Củ sạc USB trắng|white-phone-charger-on-yellow|tech|159000|Trắng
MOC|Ốp điện thoại họa tiết hoa|floral-iphone-cases|tech|99000|Họa tiết hoa
MOC|Chân máy cho góc quay tại nhà|in-home-camera-set-up|tech|499000|Đen
MOC|Bút chì thân đen|hand-holding-black-pencil-on-red-background|stationery|15000|Đen
NHE|Đồng hồ mặt tre dây da|modern-bamboo-wristwatch|accessory|549000|Gỗ da nâu
NHE|Đồng hồ analog vân đá|stone-finish-analogue-watch|accessory|629000|Vân đá
NHE|Vòng đeo tay theo dõi vận động đen|black-mi-band-smartwatch|accessory|399000|Đen
NHE|Kính mát gọng kim loại bạc|pair-of-silver-framed-sunglasses-on-a-stone-surface|accessory|249000|Bạc
NHE|Kính mát gọng hồng phấn|bold-white-framed-sunglasses-on-white-background|accessory|219000|Hồng phấn
NHE|Dây chuyền mặt hạc origami|origami-crane-necklace|accessory|189000|Bạc
NHE|Bông tai họa tiết voi|elephant-earrings|accessory|139000|Trung tính
NHE|Vòng tay boho dạng bangle|boho-bangle-bracelet|accessory|169000|Trung tính
NHE|Ghim cài áo phong cách punk|punk-enamel-pin|accessory|59000|Nhiều màu
NHE|Túi nâu phối chi tiết đen|brown-purse-with-black-detail|bag|549000|Nâu đen
NHE|Ví nhỏ hình quả chanh|lemon-purse|bag|229000|Vàng chanh
NHE|Đồng hồ quả quýt bỏ túi|a-pocket-watch-laying-on-a-black-and-orange-background|accessory|459000|Bạc'''

PROFILES={
 'jeans':('Thời trang','Quần jeans',['28','29','30','31','32'],'Vải denim'),
 'top':('Thời trang','Áo & áo khoác',['S','M','L','XL'],'Vải dệt may'),
 'shorts':('Thời trang','Quần short',['S','M','L','XL'],'Vải dệt nhẹ'),
 'dress':('Thời trang','Váy & đầm',['S','M','L'],'Vải dệt may'),
 'kids':('Thời trang','Trang phục trẻ em',['100','110','120'],'Vải may mặc'),
 'shoe':('Thời trang','Giày dép',['38','39','40','41','42','43'],'Thân giày phối đế cao su'),
 'babyshoe':('Thời trang','Giày cho bé',['18','19','20'],'Vải mềm'),
 'hat':('Túi & phụ kiện','Phụ kiện thời trang',None,'Vải dệt'),
 'bag':('Túi & phụ kiện','Túi & ví',None,'Vật liệu tổng hợp'),
 'accessory':('Túi & phụ kiện','Trang sức & phụ kiện',None,'Tùy thiết kế'),
 'beauty':('Chăm sóc cá nhân','Chăm sóc cá nhân',None,'Theo thông tin trên bao bì'),
 'household':('Nhà cửa & đời sống','Đồ dùng nhà tắm',None,'Vật liệu gia dụng'),
 'kitchen':('Nhà cửa & đời sống','Dụng cụ nhà bếp',None,'Theo từng dụng cụ'),
 'decor':('Nhà cửa & đời sống','Trang trí & lưu trữ',None,'Theo từng thiết kế'),
 'lamp':('Nhà cửa & đời sống','Đèn trang trí',None,'Kim loại'),
 'furniture':('Nhà cửa & đời sống','Nội thất',None,'Theo từng thiết kế'),
 'tech':('Góc làm việc','Thiết bị & phụ kiện',None,'Vật liệu điện tử và phụ kiện'),
 'stationery':('Góc làm việc','Văn phòng phẩm',None,'Gỗ và ruột chì'),
}

def main():
    products=[]; counts={}
    collections=json.loads((OUT/'sources/collections.json').read_text(encoding='utf8'))
    sources={slug:c for c in collections for slug in c['slugs']}
    old=json.loads((ROOT/'frontend/public/catalog/sources.json').read_text(encoding='utf8'))
    old_slugs={p['slug'] for p in old['photos']}
    for row in ROWS.splitlines():
        store,title,slug,kind,price,color=row.split('|'); counts[store]=counts.get(store,0)+1
        category,ptype,sizes,material=PROFILES[kind]
        assert slug in sources, ('Unobserved source',slug)
        assert slug not in old_slugs, ('Already in old catalog',slug)
        p={'key':store+'-'+str(counts[store]).zfill(2),'storeKey':store,'title':title,'category':category,'product_type':ptype,'price_vnd':int(price),'color':color,'material':material,'dimensions':'Chọn cỡ phù hợp' if sizes else 'Mẫu tiêu chuẩn','care':'Giữ khô, vệ sinh theo hướng dẫn của từng sản phẩm.','description':title+'. Phù hợp '+{'Thời trang':'phối đồ và sử dụng hằng ngày','Túi & phụ kiện':'làm điểm nhấn cho trang phục','Nhà cửa & đời sống':'bố trí không gian sinh hoạt','Góc làm việc':'sắp xếp góc học tập và làm việc','Chăm sóc cá nhân':'góc chăm sóc cá nhân'}[category]+'. Ảnh minh họa mẫu; thông số và giá trong gian hàng phục vụ bản demo.','photos':[slug]}
        if sizes:p['sizes']=sizes
        products.append(p)
    assert len(products)==72 and len({p['photos'][0] for p in products})==72
    (ROOT/'data/marketplace-distinct-2026.json').write_text(json.dumps({'dataset':'marketplace-distinct-2026-v1','categories':list(dict.fromkeys(p['category'] for p in products)),'products':products},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    def download(p):
        slug=p['photos'][0]; collection=sources[slug]; source=(OUT/'sources'/(collection['collection']+'-'+str(collection['page'])+'.html')).read_text(encoding='utf8')
        tile=source[source.index('href="/stock-photos/photos/'+slug):]
        match=re.search(r'https://burst.shopifycdn.com/photos/[^?"\s]+',html.unescape(tile))
        assert match, ('CDN URL not observed',slug)
        url=match[0]+'?width=1600&format=pjpg'
        file=ROOT/'frontend/public/catalog'/(slug+'.webp')
        if not file.exists():
            request=urllib.request.Request(url,headers={'User-Agent':'PBL6-Catalog-Asset-Preparation/1.0'})
            with urllib.request.urlopen(request,timeout=45) as r: data=r.read()
            img=ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert('RGB'); img.thumbnail((1200,1200),Image.Resampling.LANCZOS); img.save(file,'WEBP',quality=84,method=6)
        img=Image.open(file)
        pixels=list(img.convert('L').resize((9,8)).getdata()); dhash=sum((pixels[y*9+x]>pixels[y*9+x+1])<<(y*8+x) for y in range(8) for x in range(8))
        return {'key':p['key'],'slug':slug,'source_page':'https://www.shopify.com/stock-photos/photos/'+slug,'observed_collection':collection['url'],'source_image':url,'provider':'Burst / Shopify','license':'https://www.shopify.com/stock-photos/legal/terms','file':'/catalog/'+file.name,'width':img.width,'height':img.height,'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'dhash':format(dhash,'016x')}
    with ThreadPoolExecutor(max_workers=3) as pool: photos=list(pool.map(download,products))
    assert len({p['sha256'] for p in photos})==72
    (ROOT/'frontend/public/catalog/diverse-sources.json').write_text(json.dumps({'provider':'Burst / Shopify','usage':'Illustrative synthetic demo catalog','photos':photos},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',19)
    for store in counts:
        sheet=Image.new('RGB',(1200,1600),'white');draw=ImageDraw.Draw(sheet)
        for i,p in enumerate(p for p in products if p['storeKey']==store):
            x=(i%3)*400;y=(i//3)*400;im=Image.open(ROOT/'frontend/public/catalog'/(p['photos'][0]+'.webp'));im.thumbnail((390,340));sheet.paste(im,(x+(400-im.width)//2,y))
            draw.text((x+6,y+343),p['key']+' '+p['title'][:32],font=font,fill='black')
            draw.text((x+6,y+370),p['title'][32:],font=font,fill='black')
        sheet.save(OUT/('contact-'+store+'.jpg'),quality=90)
    similar=[(a['key'],b['key']) for i,a in enumerate(photos) for b in photos[i+1:] if (int(a['dhash'],16)^int(b['dhash'],16)).bit_count()<7]
    print(json.dumps({'products':len(products),'unique_images':len(photos),'total_bytes':sum(p['bytes'] for p in photos),'visually_similar_candidates':similar}))

if __name__=='__main__':main()
