# Timeline yeniden tasarımı — 17 Ekim 2026

## Karar

Kullanıcının tanımladığı kullanımda timeline, çoğunluğun günlük çalışma yüzeyi değil, simülasyona ayrıntılı zamanlama ayarı yapanların kullandığı bir araç. Bu nedenle tuval varsayılan ana yüzey; zamanlama editörü isteğe bağlı açılan bir panel oldu.

NN/g'nin [progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) yaklaşımı, seyrek kullanılan gelişmiş işlevlerin ikincil bir yüzeyde sunulmasını önerir. [Apple'ın Final Cut Pro yerleşim rehberi](https://support.apple.com/en-euro/guide/final-cut-pro/ver2a27194eb/mac) de timeline'ı araç çubuğundan açılıp kapanabilen ayrı bir çalışma alanı olarak ele alır. YADA'da bu örüntü, video editörlerinin yoğun arayüzünü kopyalamadan uygulanıyor. Kullanım sıklığı kullanıcı açıklamasına dayanır; yeni kullanım analitiği toplanmadı.

## Uygulanan düzen

- **Varsayılan kapalı:** İlk durum, yeni çalışma alanı/belge ve belge değiştirme timeline'ı kapalı başlatır. Oynatmak paneli açmaz. Mevcut toolbar anahtarı korunur; küçük oynatma şeridindeki Zamanlama düğmesi ikinci bir giriş sağlar.
- **Tek satır oynatma:** Oynat/duraklat, durdur, tek hız seçicisi, ince konum kaydırıcısı, süre ve zamanlama girişi. Dört büyük hız düğmesi kaldırıldı. Boş tuvalde bu şerit de yok.
- **İsteğe bağlı editör:** Açıldığında 37 px araç satırı, adımlar ve zaman çubukları görünür. Döngü, adımlar arasında geçiş, ölçek ve konuma git gelişmiş panelde bulunur. 1× tüm akışı sığdırır.
- **Açıklama yerine bağlam:** Büyük Preview flow/Edit timing düğmeleri yerine küçük bir Düzenle anahtarı var. Açıklamalar yardım penceresinde; seçili adım bilgisi yalnızca seçim olduğunda görünür. Çubukları sürükleme Düzenle ile açılır; sayısal detay penceresine seçimden erişilir.
- **Daha yoğun adım listesi:** Satırlar 64 → 56 px. Kaynak/hedef ve tek açıklama satırı gösterilir; iç işlem ayarları ayrıntı penceresinde korunur. Sıralama/eşzamanlılık/silme eylemleri yalnızca düzenleme açıkken seçili satırda görünür.
- **Kompakt kontrol boyutu:** Masaüstü oynatma/ayar ikonları 28 px, mobil temel oynatma ikonları 32 px. Hız alanı mobilde 16 px yazı kullanır. Bu ölçüler timeline'a özel; uygulamanın diğer kontrolleri tekrar küçültülmedi.
- **Kapalı panelin maliyeti:** Adım listesi, düğüm/bağlantı haritaları ve sürükleme dinleyicileri kapalıyken mount edilmez. Temel oynatma döngüsü çalışmaya devam eder. Bu bir JS paket aktarım ölçümü veya büyük simülasyon optimizasyonu iddiası değildir.

## Ölçüm ve kabul

| Yerel arayüz ölçümü | Sonuç |
|---|---:|
| Masaüstü kapalı oynatma şeridi | 36 px |
| Mobil kapalı oynatma şeridi | 40 px |
| Açık panelin ayar çubuğu | 37 px |
| Açık panelin başlangıç yüksekliği | 240 px, yeniden boyutlandırılabilir |
| 1280 × 720: panel kapalı tuval | 603 px |
| Aynı ekran/belge: panel açık tuval | 396 px |
| Boş tuval: kapalı panelin alanı | 0 px |

Önceki varsayılan 250 px açık panelin yerini 36 px masaüstü oynatma şeridi aldı. Daha önce kullanıcı paneli kapattığında da yaklaşık 74 px alan kullanılıyordu; bu kapalı görünüm artık 36/40 px.

[Ham matris](timeline-matrix.json): altı tema × TR/EN × 320 × 568 / 1280 × 720 = 24 kombinasyon. Her belge açılışında editör kapalıydı. Açma/kapatma, toolbar/oynatma şeridi sınırları ve minimum kontrol boyutları kontrol edildi; yatay taşma veya sınır dışında kontrol bulunmadı. Mobilden açılan editör çekmece kullanır; masaüstünde yeniden boyutlandırılabilen alt paneldir.

Küçük iki adımlı referansta oynat/duraklat/durdur, hız seçimi, seçili adım, sayısal zamanlama düzenleme ve geri alma kontrol edildi: 1.200 → 1.400 ms uygulandı, geri almayla 1.200 ms geri geldi. Panel kapalıyken oynatma editörü açmadı. Yeniden yüklemede kapalı başlangıç ayrıca kontrol edildi.

Regresyonlar: ilk durumda kapalı olma, yeni belge/belge değiştirme, kapalıyken adım DOM'unun bulunmaması, boş tuvalde şeridin olmaması, TR/EN katalogları ve salt okunur detay erişimi. **50 dosyada 297 test başarılı.** Web, Forge, Data Center ve imzasız debug Tauri derlemeleri doğrulandı.

Normal üretim önizlemesinde de masaüstü kapalı şerit 36 px / tuval 603 px, mobil şerit 40 px ve açık araç çubuğu 37 px olarak doğrulandı. Mobil panel kapanınca odak Zamanlama girişine döndü. [Üretim ölçümleri](timeline-production.json), [işlevsel kontrol](timeline-functional.json).

Ekranlar: [varsayılan görünüm](timeline-default-tr.png), [açılmış panel](timeline-expanded-tr.png), [mobil panel](timeline-mobile-tr.png). Ekran okuyucu kabulü kullanıcı isteğiyle kapsam dışında. Büyük diyagram simülasyonu çalıştırılmadı.

## Sonraki UX araştırması için adaylar

- Gerçek zamanlama görevlerinde adım bulma zorlaşıyorsa arama/filtreleme eklemek.
- Sayısal süre/gecikme ayarı sık kullanılıyorsa seçili adım ayrıntısını satır içinde düzenlemeyi karşılaştırmak.
- Günlük kullanıcıda “oynat”, ileri kullanıcıda “belirli adımı bul ve gecikmesini değiştir” görevlerini gözlemlemek; yeni araç eklemeden önce bu iki yolu değerlendirmek.

Bu adaylar uygulanmış özellik veya tamamlanmış kullanıcı testi olarak raporlanmaz.
