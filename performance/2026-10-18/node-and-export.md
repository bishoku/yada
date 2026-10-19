# Node, parçacık ve canvas görünümüne bağlı dışa aktarma

18 Ekim 2026. Büyük diyagram simülasyonu ve ekran okuyucu kabulü kapsam dışında. Bu rapor küçük referans sahneye ve yerel tarayıcıya aittir; fiziksel cihaz veya native WebView kabulü değildir.

## Uygulananlar

- Bileşen, serbest çizim, grup, yapışkan not ve sıralama katılımcılarında seçim ince kesikli bir dış çizgiyle gösterilir. Aktif kart büyümez; küçük durum noktası ve hafif vurgu kullanır. İç işlem küçük yeşil gösterge ve kısaltılmış açıklama kullanır. Yeniden boyutlandırma köşeleri düzenleme sırasında korunur; oynatma ve salt okunur görünümde gizlenir.
- Hareketli nokta 4 tuval birimi yarıçapında; diğer protokol simgeleri önceki boyutun yarısında. Hareketli numara/halo kaldırıldı, adım numarası sabit bağlantı etiketinde kalır. Ok gidişte rotayı, dönüşte ters yönü izler; diğer simgeler dik kalır. Zamanlama, tekrar sayısı, iç işlem, bağlantı düzenleme ve simülasyon verisi değiştirilmez.
- Yeni durum açıklamaları TR/EN. Sıralama katılımcısının tür adı da yerelleştirilir. Not fontunun bulunamayan Inter yerine uygulamanın yerel fontuna dönmesi sağlandı.
- PNG/SVG varsayılanı görünür tuval; dışa aktarma menüsünden Tüm diyagram seçilebilir. Tema, font, ikon, gölge, özel renk ve aktif görsel durum korunur. Düzenleme tutamaçları ve uygulama kontrolleri çıktıdan çıkarılır. SVG içindeki yardımcı katmanlar ayrıca geçici gizlenir ve tüm stilleri geri yüklenir.
- HTML/video aynı gerçek DOM sahnesinden üretilir. Değişmeyen görsel durumlar bir kez yakalanır; hareketli parçacıklar küçük SVG varlıkları ve dönüşüm matrisleriyle taşınır. Zamanlı notlar yakalamada da oynatma zamanına uyar. İşlem bitince önceki zaman, oynatma durumu ve kadraj geri yüklenir; belge değişirse eski belgenin konumu yeni belgeye uygulanmaz.
- Video tek canvas, iki arka plan bitmap önbelleği ve en fazla dört karelik WebCodecs kuyruğu kullanır. Her kare/encoder kapatılır. H.264/MP4, ardından VP9/VP8 WebM denenir; uygun encoder yoksa aynı sahneyi MediaRecorder gerçek zamanlı kaydeder. MediaRecorder otomatik kare akışı, requestFrame olmayan tarayıcılar için de açıktır. Yüksek çözünürlük seçimi gerçek çıktı boyutuna uygulanır.
- HTML bağımsız dosyadır: fontlar/görseller gömülüdür; oynat/duraklat/durdur, hız, zaman kaydırma, adım seçimi, yakınlaştırma ve kaydırma vardır. Oynatıcı dili TR/EN; diyagram içeriği kullanıcının canvas'ta gördüğü haliyle korunur.

## Ölçüm

Gerçek BaseNode/AnimatedEdge/StickyNote renderer ve simülasyon saati; 2 bileşen, 1 gidiş-dönüş bağlantı, 300 ms iç işlem ve zamanlı not. 1.500 ms, 15 FPS; 24 zaman örneği (son örnek bitiş noktası), video 23 kare. Canvas 1280 × 608. Geliştirme sunucusunda aynı oturum ölçümü; istatistiksel kıyas veya büyük sahne iddiası değildir.

| Ölçüm | Her örnekte yakalama | Durum önbelleği |
|---|---:|---:|
| DOM görüntüsü | 24 | 3 |
| Yakalama | 801,3 ms | 128,6 ms |
| Serileştirilmiş sahne | 22.729.067 karakter | 2.869.216 karakter |

Yakalama yaklaşık %84 azaldı. Sahne maliyetine font hazırlama dahildir. Serileştirme ölçüsü JS metin uzunluğudur, heap ölçümü değildir. Uzun ve çok durumlu sahnelerde SVG varlıkları ve kare matrisleri büyümeye devam eder; bütün video süresinin tam boyutlu RGBA kareleri bellekte biriktirilmez.

MP4 kodlama: **171,6 ms**, **114.119 byte**, **1,5 saniye**, encoder kuyruğu en fazla **4**. Kompozitörün üç tam boyutlu yüzeyi (canvas + iki arka plan) bu çözünürlükte yaklaşık 8,9 MiB RGBA eder; sprite'lar, encoder iç belleği, SVG metinleri ve tarayıcı overhead'i bu hesaba dahil değildir. Toplam heap ölçülmedi.

Küçük referansta aynı kare karşılaştırması: DOM→sahne PSNR 35,41 dB; sahne→MP4 37,75 dB. Bunlar sınırlı referans karşılaştırmalarıdır; bütün şekillerde piksel eşitliği garantisi değildir. SVG ve PNG ayrıca görsel olarak açıldı; SVG XML ayrıştırma hatası yok. Önceki bağımsız video çizicisiyle kalite/hız kıyası yapılmadı.

## Kabul ve sınırlar

- 62 test dosyasında **362 test**: parçacık şekilleri, font filtreleme, zaman örnekleri, süre, yakalama sırası, belge/zaman/viewport geri yükleme, hata temizliği, encoder kuyruğu ve kare kapatma, MediaRecorder oluşturma hatasında stream temizliği, TR/EN HTML ve HTML kaçışları dahil.
- Web, Forge ve Data Center üretim derlemeleri başarılı; mevcut büyük chunk uyarıları devam ediyor.
- Altı tema: light/dark/nord/dracula/synthwave/retro; aktif/işleniyor durumları ve özel kart rengi korundu. Seçim görünümü ve ok gidiş/dönüş yönleri kontrol edildi. Gerçek uygulamada sıralama görünümü ve yerel tür adları doğrulandı.
- Gerçek dışa aktarma menüsünde görünür tuval varsayılanı, Tüm diyagram seçimi ve video ayarına taşınması doğrulandı. TR HTML adım listesi/zaman kaydırma/yakınlaştırma ve EN HTML oynat/durdur kontrol edildi. 360 px HTML oynatıcıda yatay sayfa taşması bulunmadı.
- MediaRecorder fallback kaynak temizliği birim testinde; bu oturumdaki gerçek video WebCodecs/MP4 ile üretildi. Safari ve native codec/indirme akışı ayrı cihaz kabulü gerektirir.
- SVG, tarayıcı görünümünü korumak için foreignObject kullanır; bütün vektör düzenleyiciler aynı şekilde göstermeyebilir. Tarayıcı font rasterizasyonu, video sıkıştırması ve parçacıkların düğüm kesişimindeki katman sırası gibi ayrıntılarda fark oluşabilir. Uzak özel görsellerin CORS kısıtları devam eder.
- GIF mevcut ayrı çizim akışını kullanmaya devam eder. Bu paketin görünüm hedefi PNG/SVG/HTML/video içindir.

## Örnekler

- [PNG](canvas-faithful.png), [SVG](canvas-faithful.svg), [MP4](canvas-faithful.mp4)
- [TR HTML](canvas-faithful-tr.html), [EN HTML](canvas-faithful-en.html)
- [Seçili ve işleniyor node](node-processing-selected.png), [Koyu temada aktif node](node-active-dark.png), [HTML önizleme](html-tr-preview.png), [Video ayarları](video-options-tr.png)

Yerel tekrar ekranı: `node-export.html`; ürün girişine veya üretim bundle'ına dahil edilmez.
