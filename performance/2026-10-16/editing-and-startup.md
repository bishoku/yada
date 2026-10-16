# Açılış, düzenleme ve bellek ölçümü — 16 Ekim 2026

Büyük diyagram oynatma/simülasyon darboğazı bu pakete dahil değildir. Önceki simülasyon raporları ayrı kapsamda kalır.

## Yöntem ve sonuçlar

Gerçek Zustand işlemleri, 25 ve 250 düğüm; bağlantılar, adımlar ve her biri 500 noktalı 10 kalem çizimi. Bir ısınma ve beş ölçüm; 40 tamamlanmış hareket, 30 geri alma ve 30 ileri alma. Node 26.3.0, macOS arm64. CPU değerleri beş koşunun medyanlarının medyanı. Bellek farkı zorlanmış GC sonrasında geçmişli yığın eksi başlangıç yığınıdır. Eski JSON kopyalama yöntemi ayrı profil derlemesinde enjekte edilir ve etkin olduğu testte doğrulanır.

| Ölçüm | Önce | Sonra |
|---|---:|---:|
| 25 düğüm: düzenleme | 0,334 ms | 0,163 ms |
| 25 düğüm: geri / ileri alma | 0,330 / 0,327 ms | 0,136 / 0,137 ms |
| 25 düğüm: geçmişin ek belleği | 7.229 KiB | 617 KiB |
| 250 düğüm: düzenleme | 0,506 ms | 0,204 ms |
| 250 düğüm: geri / ileri alma | 0,788 / 0,768 ms | 0,419 / 0,391 ms |
| 250 düğüm: geçmişin ek belleği | 9.935 KiB | 949 KiB |
| 250 düğüm: veriyi store'a yükleme | 0,501 ms | 0,554 ms |

Veriyi store'a yükleme süresinde iyileşme gözlenmedi; bu değer disk okuma, ayrıştırma veya ekrana çizim süresi değildir. Geçmiş belleği 250 düğümde yaklaşık %90 azaldı. Kopyalanan değişmemiş varlıklar geçmiş kayıtları arasında paylaşılır; dışarıdan gelen değiştirilebilir kaynaklar kopyaya sızmaz. Geçmiş boşaltılınca önbellek sıfırlanır. Altı düzenle/kapat döngüsünde GC sonrası yığın yaklaşık 11.795 → 11.799 KiB seviyesinde sabitlendi. Bu, yalnızca bu döngüde sürekli büyüme gözlenmediğini gösterir; tüm uygulamada sızıntı olmadığının kanıtı değildir.

Ham sonuçlar: [önce](edit-baseline.json), [sonra](edit-after.json). Tekrar: `YADA_HISTORY_BASELINE=1 YADA_MEASURE_LABEL=baseline npm run measure:editing`, `YADA_MEASURE_LABEL=after npm run measure:editing`. Dosya yazma seçenekleri ölçüm betiğinde tanımlıdır.

## Tarayıcı açılışı

İzole üretim profil derlemesi; localhost, Chrome 155, 1280 × 720, ağ/CPU yavaşlatma yok, service worker kurulumu kapalı. Önce ve sonra ayrı originlerde bir ilk ziyaret ve beş önbelleği sıcak yenileme. Başlık hazır zamanı iki animation frame sonrasında; LCP gözlemcisi bir saniye daha izlenir. Ana sayfa doğrudan yüklenir; paylaşım, gömülü kullanım, Tauri ve host rotaları aynı ön yüklemeye zorlanmaz.

| Ölçüm | Önce | Sonra |
|---|---:|---:|
| İlk ziyaret: başlık hazır (n=1) | 363 ms | 56,6 ms |
| İlk ziyaret: LCP (n=1) | 384 ms | 80 ms |
| Sıcak yenileme: başlık hazır medyanı (n=5) | 347 ms | 43,5 ms |
| Sıcak yenileme: LCP medyanı (n=5) | 372 ms | 60 ms |

Ham sonuçlar: [önce](startup-browser-before.json), [sonra](startup-browser-after.json). Bunlar yerel laboratuvar ölçümleridir; gerçek kullanıcı p75/Core Web Vitals/INP kabulü değildir. İşletim sistemi ve disk önbellekleri temizlenmedi. Kayıtlı diyagramın diskten açılış süresi ayrıca ölçülmelidir.

**Aktarım sınırlaması:** JSON içindeki kaynaklar/transferBytes başlık hazır olduğunda alınmıştır. Sonraki sürümde başlık daha erken geldiği için geç yüklenen fontların örnekleme penceresi farklıdır. Bu alanlar toplam başlangıç aktarımı değildir ve önce/sonra ağ tasarrufu iddiası için kullanılmaz.

Normal web derlemesinin statik import grafiğinde ana sayfaya gereken JS yaklaşık 638 KB → 500 KB (gzip toplamı 194 KB → 151 KB). `startup-before.json` ve `startup-after.json` kesin bayt ve dosya listesini içerir. CSS, font, HTTP başlıkları ve PWA önbelleği dahil değildir; ilk ekran ağ aktarımı değildir. Başlangıçtan native/host sürücüleri, ZIP ve görüntü içe aktarma/paylaşım bağımlılıkları ayrıldı; ana sayfadaki kısa Suspense beklemesi kaldırıldı. Ölçüm paneli normal üretim derlemesine dahil edilmez.

## Kontrol yoğunluğu ve timeline

Ortak butonlar 40 → 32 px, mobilde 44 → 36 px. İkon kontrolleri masaüstünde 30 px. Ana, paylaşım, içe aktarma önizlemesi ve stüdyo başlıkları 56 → 44 px. Ana başlık tuvale 12 px geri kazandırır. Menü/sekme/form ölçüleri aynı ritme uyarlanır; mobil girişlerde 16 px yazı korunur. Bileşen kitaplığı satırlarının dolgusu ve satır arası boşluğu azaltılır.

Timeline'da akışı izleme ile zamanlama düzenleme ayrılır. Varsayılan izleme modunda yanlışlıkla sürükleme/silme yapılmaz. Zamanlama hareketi bırakıldığında tek geçmiş kaydı oluşur; Escape veya pointer iptali kaydetmez. Sığdır ve konuma git düğmeleri açıklamalı ikon kullanır. Mobil hız seçenekleri açılır kontrol, süre kaydırıcı yanında gösterilir. Yeni metinler TR/EN katalog sözleşmesine dahildir.


## Son kabul

45 dosyada 275 test; web, Forge, Data Center ve imzasız debug Tauri derlemeleri başarılı. Büyük isteğe bağlı paket uyarıları devam eder. Native/host sürücüler için bu turda canlı sunucu kabulü yapılmadı.

1280 × 720 masaüstünde header 44 px, oynat butonu 32 px; kontrol satırı 47 px. 390 × 844 mobilde header 44 px ve oynat 36 px. Kapalı timeline bu paket içindeki ilk kompakt düzenin 119 px ölçümünden 74 px'e indi; aynı ekranda tuval 644 → 689 px. Bu 45 px fark, mobil hız seçicisi/süre yerleşimi değişikliğinin farkıdır; bütün paketin eski sürüm karşılaştırması değildir. Yatay sayfa taşması 0 px. Mobil izleme modunda adım listesi daralır; düzenlemede satır eylemlerine yer açılır. Adım adı ve eylemler dar ekranda iki satıra ayrılır, zamanlama çubuklarıyla satır hizası korunur.

Ekranlar: [masaüstü EN](compact-desktop-en.png), [mobil TR](compact-mobile-tr.png), [mobil timeline TR](compact-timeline-mobile-tr.png), [mobil düzenleme EN](compact-timing-mobile-en.png). TR/EN hız biçimleri, mod değişimi, seçim, modal dil değişimi ve dar ekranda taşma kontrol edildi. Fiziksel cihaz/ekran okuyucu/tüm temalar ve gerçek kullanıcı gecikmesi kabulü açıktır.
