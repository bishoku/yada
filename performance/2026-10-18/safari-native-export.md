# Safari ve native dışa aktarma kabulü — 18 Ekim 2026

macOS Safari 26.6.2 ve gerçek Tauri uygulamasında çıktı üretimi kontrol edildi. Native kabul, ayrı kimlikle derlenen `YADA Export Check` ad-hoc debug uygulamasında yapıldı; kurulu YADA uygulaması değiştirilmedi. Bu rapor önceki node-and-export.md raporundaki bekleyen Safari/native kabulünü tamamlar; diğer işletim sistemlerini kapsamaz.

## Bulunan ve düzeltilen sorunlar

1. WebKit değişken fontları `woff2-variations` olarak tanımlıyordu. html-to-image'a verilen `preferredFontFormat: woff2` filtresi font kaynaklarını siliyordu. Filtre kaldırıldı. Gerçek native SVG'de önce 4 font kuralında sıfır kaynak varken sonra 4 gömülü font kaynağı var. PNG'deki kesilen HTTP/SQL etiketleri düzeldi.
2. WebKit parçacık CTM'si üst CSS viewport dönüşümünü eksik bildiriyordu; HTML/video parçacıkları çizginin dışında görünebiliyordu. Gerçek boyanmış sınırla ölçek ve konum düzeltilir, dönme matrisi korunur. Saf geometri testleri ve Safari'de native HTML oynatma/zoom ile doğrulandı.
3. Video encoder kuyruğu en fazla 4 kareyle sınırlandı. Ara flush döngüsü kaldırıldı; codec sorgusu, son flush, recorder başlangıcı/bitişi ve resim yüklemesine zaman sınırı eklendi. Hatalı sahne bütün codec'lerde tekrar çizilmez. MediaRecorder bir formatın oluşturulması başarısızsa sonraki desteklenen formata geçer; bitiş ve hatada track/handler kaynakları bırakılır.
4. Görsel önbelleğinden çıkan ve dispose edilen sahnelerin decoded image kaynakları serbest bırakılır.

## Kabul ve ölçümler

| Ortam / akış | Kanıt |
| --- | --- |
| Safari PNG | Üretim, indirme ve görünür çıktı önizlemesi başarılı |
| Safari WebCodecs MP4, son font/geometri kodu | 1324×658, 1,5 sn, 23 kare; yakalama 174 ms, kodlama 163 ms, maksimum kuyruk 4; 84.757 bayt |
| Safari gerçek MediaRecorder fallback | 1,5017 sn; kodlama 1554 ms; 107.562 bayt; Apple çözücüsüyle kare açıldı |
| Safari TR HTML | İndirilen file:// çıktı açıldı; Oynat/Duraklat/Durdur ve işlem adımları çalıştı |
| Native PNG ve SVG | Gerçek kaydetme diyaloğu ve dosya kaydı başarılı; tam fontlu SVG Safari'de açıldı |
| Native EN HTML | Gerçek kayıt, Safari'de açma, oynatma, adım 2'ye 900 ms seek ve zoom başarılı |
| Native son MP4 | Gerçek kayıt; Apple AVFoundation çözümlemesi: 1252×710, 3,0 sn, 1 video track, 733 ms kare başarıyla açıldı; parçacık çizgi üzerinde |

Son Safari referansı 24 simülasyon örneğinden 3 görsel durum yakalar. Bu küçük örnek ölçümüdür; büyük diyagram kıyası veya toplam heap ölçümü değildir. MediaRecorder ölçümü ilk referans koşusunda yapılmıştır; son fontlu WebCodecs koşusuyla doğrudan hız karşılaştırması olarak okunmamalıdır. Farklı native yakalamalarda node düzeni değiştiği için önce/sonra kareler piksel kıyası değildir.

Ürün arayüzüne yeni metin eklenmedi; mevcut TR/EN hata akışı ve HTML oynatıcı metinleri korundu. Safari final referansının DOM kıyası PSNR 35,71 dB; video sıkıştırması, SVG foreignObject desteği ve uzak görsellerin CORS kuralları görsel eşleşmenin sınırlarıdır. Piksel eşitliği iddiası yoktur.

## Çıktılar

- [Fontu düzeltilmiş native PNG](native-export-fixed.png) ve [SVG](native-export-fixed.svg)
- [Son native HTML](native-export-geometry.html), [MP4](native-export-geometry.mp4), [çözümlenen video karesi](native-export-geometry.mp4.frame.png)
- [Safari TR HTML](safari-export-tr.html), [MP4](safari-export.mp4), [MediaRecorder MP4](safari-recorder.mp4)
- [Safari'de native HTML ekranı](native-html-safari-fixed.png)

Otomatik kapsam font kaynakları, bounded queue/deadline temizliği, codec fallback, bozuk sahnede erken çıkış, image lifetime ve parçacık dönüşümünü içerir. Connector düzeltmeleriyle birlikte son tam çalışma: **66 dosya, 379 test başarılı**. Büyük diyagram simülasyonu ve ekran okuyucu kabulü kapsam dışıdır. iOS Safari, Windows/Linux native ve release/notarization kabulü yapılmadı.
