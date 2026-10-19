# YADA arayüz deneyimi yerelleştirme ve performans planı

16 Ekim 2026

YADA güçlü bir diyagram ve simülasyon altyapısına sahip. Premium ürün hedefinin önündeki temel engeller; yoğun araç yerleşimi, küçük yardımcı metinler, ekran boyutuna yeterince uyarlanmayan editör, parçalı yerelleştirme ve büyük serbest diyagramlarda kesintili oynatma. Önerilen yatırım sırası: kalite ölçütlerini kurmak, ortak arayüz ve çeviri altyapısını tamamlamak, temel ekranları yenilemek, ölçülen darboğazları gidermek ve platformlar üzerinde kabul kontrollerini tamamlamak.

İlk değerlendirme uygulama değişikliği içermiyordu; uygulama ilerlemesi aşağıda ayrıca kaydedilir. Yeni özellik geliştirmeden önce mevcut oluşturma, düzenleme, oynatma, kaydetme ve paylaşma akışlarının kalitesini yükseltir.

## Değerlendirmenin kapsamı

Yerel web uygulamasında karşılama, tercihler, çalışma alanı kontrol paneli, serbest diyagram ve sıralama görünümü incelendi. Türkçe ve İngilizce dil geçişi denendi. Masaüstü için 1440 × 900, telefon genişliği için 390 × 844 görünüm kontrol edildi. İnceleme sırasında mevcut Nord teması kullanıldı; diğer temalar kod üzerinden değerlendirildi. Telefon genişliği kontrolü gerçek cihazda dokunmatik kullanım testi değildir.

Kaynak kod, çeviri sözlüğü, derleme çıktısı, otomatik testler ve mevcut [önceki değerlendirme](/Users/barishoku/devel/diagramer/evaluation.md) birlikte ele alındı. Önceden giderilmiş kayıt ve sıralama performansı sorunları yeni yapılacak işler olarak tekrar listelenmedi. Tauri, Forge ve Confluence Data Center için gerçek ortam doğrulaması ayrı kabul işidir.

| Alan | Güncel bulgu | Kullanıcıya etkisi |
| --- | --- | --- |
| Görsel kalite | Yazı tipi ve tema altyapısı var; yoğun ikon sırası, küçük metinler ve benzer yüzey tonları hiyerarşiyi zayıflatıyor. | Araçları öğrenmek ve önemli eylemi bulmak zorlaşıyor. |
| Dar ekran | 390 px genişlikte 260 px sol panel kontrol panelini sıkıştırıyor; içerik kesiliyor. | Çalışma alanı yönetimi telefon genişliğinde kullanışlı değil. |
| Yerelleştirme | Merkezi sözlükte iki dilde de 306 yaprak anahtar var; eksik anahtar yok. Kodda ayrıca 297 satırda Türkçe dil koşulu bulunuyor. | Sözlük eşitliği tüm arayüzün çevrildiğini göstermiyor. |
| Güven ve geri bildirim | Karşılama ekranında mevcut kayıtta `Invalid Date` görünüyor; sanal depolamada fiziksel dosya izlenimi veren açıklama kullanılıyor. | Verinin nerede ve ne zaman kaydedildiği belirsizleşiyor. |
| Erişilebilirlik | Bazı yeni modaller dialog semantiğine sahip; genel onay penceresinde odak yönetimi ve dialog semantiği eksik. | Klavye ve ekran okuyucu kullanımı tutarlı değil. |
| Performans | Sıralama görünümünün görünür alan optimizasyonu mevcut; büyük serbest diyagram yavaş kalıyor. | Büyük topolojilerde oynatma takılıyor. |

## Premium arayüz yönü

YADA'nın görsel kimliği mimari tasarım ve canlı akış üzerine kurulmalı. Tuval ana odak olmalı; etkin simülasyon yolu ürünün ayırt edici görsel öğesi olarak kullanılmalı. Kalıcı parıltı, yoğun gölge ve tüm araçlara aynı vurgu verilmesi azaltılmalı.

Önerilen başlangıç paleti: koyu zemin `#101827`, panel `#182235`, sınır `#2B3B52`, ana metin `#EDF2F7`, eylem rengi `#7288FF`, çalışan akış `#35C5AD`. Bunlar tasarım önerisidir; metin, ikon ve durum kombinasyonları kontrast ölçümünden geçmeden kesinleşmemeli. Aydınlık tema aynı anlamsal renk rollerini kullanmalı; mevcut alternatif temalar korunarak aynı kurallara bağlanmalı.

Mevcut Outfit başlık ve Plus Jakarta Sans arayüz eşleşmesi korunabilir. Başlıklarda ölçülü ağırlık; ana kontrollerde 13–14 px; yardımcı bilgide mümkün olduğunca en az 12 px kullanılmalı. Zaman ve sayısal değerlerde hizalı rakamlar tercih edilmeli. Türkçe karakterleri içeren fontlar yerel sunulmalı; el yazısı fontları ilgili araç açıldığında yüklenmeli.

Ortak renk, boşluk, yazı, köşe, gölge, odak ve hareket kuralları kurulmalı. Button, IconButton, Input, Select, Dialog, Menu, Tooltip, Tabs, Toast ve EmptyState bileşenleri aynı etkileşim sözleşmesini kullanmalı. Görünür klavye odağı, yükleniyor/devre dışı durumları ve azaltılmış hareket tercihi bu bileşenlerin parçası olmalı.

## Önceliklendirilmiş işler

P0, geliştirmeyi ve yayını yöneten temel koşullardır. P1, bu hedef sürümün zorunlu ürün işleridir. P2, bu işlerden sonra yapılacak ilave iyileştirmelerdir. Türkçe ve İngilizce kapsamı P1 sonunda eksiksiz olmalı.

| Öncelik | İş | Teslimat ve kabul ölçütü | Tahmini emek |
| --- | --- | --- | --- |
| P0 | Ölçüm ve kabul tabanı | Üretim sürümünde sabit cihaz, tarayıcı, görünüm ve veri boyutuyla tekrar edilebilir ölçümler; ana akış ve dil envanteri. | 2–3 iş günü |
| P0 | Kayıt güveni ve yayın kontrolleri | Mevcut kayıt korumaları korunur; başarısız kayıtta pencere kapanmaz. Tauri kapatma ve gerçek Confluence kaydet/aç akışları doğrulanır. | 2–3 iş günü; ortam erişimine bağlı |
| P1 | Ortak arayüz altyapısı | Renk ve ölçü kuralları ile ortak kontroller; tüm diyaloglarda odak, Escape ve odağın geri dönmesi. | 3–5 iş günü |
| P1 | Türkçe ve İngilizce kapsamı | Tüm kullanıcıya görünen metinler, tooltip, erişilebilir ad, hata ve dışa aktarılan oynatıcı kontrolleri merkezi çeviri katmanına taşınır; kapsam kontrolleri otomatikleşir. | 4–6 iş günü |
| P1 | Editör ve başlangıç akışları | Yeni üst araç düzeni, örnekten başlama, bağlama göre özellikler, daha okunur zaman çizelgesi ve dar ekran panel davranışı. | 4–6 iş günü |
| P1 | Açılış ve büyük diyagram performansı | Gerçek yükleme sınırları, ikon/font/önbellek iyileştirmeleri; serbest görünümde ölçülen kare süresi hedefleri. | 5–8 iş günü |
| P1 | Bütünleşik kabul | İki dil, temalar, ekran boyutları, depolama ve çıktı doğrulamaları; mevcut dosyalarla uyumluluk. | 2–4 iş günü |
| P2 | İleri üretkenlik | Komut arama, özelleştirilebilir panel düzeni ve gelişmiş klavye keşfi; ana kalite hedefleri sağlandıktan sonra. | Ayrı kapsam |

P0 ve P1 için ilk tahmin toplam 22–35 kişi iş günüdür. Tek geliştirici için yaklaşık 5–7 hafta planlanabilir; gerçek platform erişimi, tasarım geri bildirimi ve üretim profili sonrasında tahmin yenilenmeli. Her satır bir veya birkaç küçük değişiklik olarak teslim edilmeli; toplu yeniden yazım yapılmamalı.

## Kullanıcı akışlarında yapılacak değişiklikler

**Başlangıç ve çalışma alanı:** Boş başla, örnek kullan ve içe aktar seçenekleri anlaşılır bir öncelikle sunulmalı. İlk oynatılabilir örneğe ulaşmak için klasör/çalışma alanı kavramını öğrenme zorunluluğu azaltılmalı. Son kullanılan kayıtlarda kullanıcı adı ön planda tutulmalı; `virtual://` gibi depolama ayrıntıları gerektiğinde açılmalı. Geçersiz tarihler yerelleştirilmiş güvenli bir metinle gösterilmeli. Tarayıcı, yerel klasör ve bulut depolaması için açıklamalar gerçek davranışı anlatmalı.

**Editör:** Üst çubukta belge ve kayıt durumu, görünüm seçimi ve temel eylemler açık gruplar halinde yer almalı. Çizim, tema, arka plan ve gelişmiş araçlar bağlamsal menülere taşınmalı. Soldaki diyagram gezgini ile bileşen kütüphanesi ayrı sekmeler veya bölümlerle sadeleştirilmeli. Sağ panel seçim olmadığında yönlendirme, seçim olduğunda ilgili özellikleri göstermeli. Boş tuval kullanıcıyı bileşen ekle → bağla → adım tanımla → oynat sırasıyla yönlendirmeli.

**Zaman çizelgesi:** Oynatma kontrolleri ile zamanlama düzenleme kontrolleri ayrıştırılmalı. Seçili adımın başlangıç, bitiş, süre ve gecikmesi okunur tutulmalı; mevcut zamanlama anlamları korunmalı. Büyük listelerde görünür satırların çizilmesi değerlendirilmeli. Boyutlandırma yalnızca fare hareketine bağlı kalmamalı; klavye ve pointer desteği eklenmeli.

**Dar ekran:** Telefon genişliğinde yan paneller çekmece veya alt panel olmalı; yalnızca gerekli panel açılmalı. Kontrol panelinde bileşen kütüphanesi varsayılan olarak yer kaplamamalı. Araç çubuğu öncelikli eylemleri göstermeli, diğerleri taşma menüsüne geçmeli. Bileşen ekleme için sürüklemenin yanında dokunarak ve klavyeyle ekleme yolu bulunmalı. Telefon, tablet ve masaüstü kontrolleri 390, 768, 1024 ve 1440 px genişliklerde yapılmalı.

## Eksiksiz yerelleştirme planı

Mevcut [çeviri sözlüğü](/Users/barishoku/devel/diagramer/src/i18n/translations.ts) anahtar bakımından eşit. Sorun, sözlük dışındaki metinler ve dağınık çeviri yaklaşımıdır. Doğrulanmış örnekler:

- [Uygulama yükleme durumu](/Users/barishoku/devel/diagramer/src/App.tsx:37) sabit `Loading...` kullanıyor.
- [Bağlantı ipucu](/Users/barishoku/devel/diagramer/src/components/canvas/AnimatedEdge.tsx:664) İngilizce kullanımda Türkçe kalıyor.
- [Studio araçları](/Users/barishoku/devel/diagramer/src/components/studio/StudioInspector.tsx:163) sabit Türkçe başlıklar içeriyor.
- Türkçe karşılama ekranında `Showcase` rozeti ve bağlantı adı kısmen İngilizce kalıyor.
- [HTML dili](/Users/barishoku/devel/diagramer/index.html:2) `en` olarak sabit; uygulama diliyle güncellenmiyor. Türkçe tercihlerde büyük harfli dil etiketi `DIL` görünüyor; `DİL` olmalı.
- Genel onay penceresinde sabit `OK` yedeği var; dışa aktarılan HTML şablonlarında da dil ve kontrol kapsamı tamamlanmalı.

Önce `common`, `workspace`, `editor`, `timeline`, `studio`, `importExport`, `share`, `collaboration`, `errors` alanlarıyla tek, tür güvenli çeviri API'si kurulmalı. Bileşen içi sözlükler ve dil koşulları aşamalı taşınmalı. Mevcut yaklaşım yeterliyse kütüphane değişimi zorunlu tutulmamalı; çoğul ve parametreli mesaj ihtiyaçlarıyla karar verilmeli.

Dil değişimi `html.lang`, tarih/sayı biçimleri, hata bildirimleri, üçüncü taraf kontrolleri ve dışa aktarılan oynatıcı arayüzlerine uygulanmalı. Kullanıcının diyagram adları, notları, protokol değerleri ve dosya şeması çevrilmemeli. Türkçe aramada `I/İ/ı/i` eşleşmesi kontrol edilmeli. Terimler sözlüğü kullanıcıya uygun bir editoryal kontrolden geçirilmeli; timeline, sequence, connection ve round trip tüm ekranlarda aynı karşılığı kullanmalı.

Kabul koşulları: eksik/boş anahtar sıfır; parametre ve çoğul uyumsuzluğu sıfır; izin verilen marka/standart terimleri dışında sabit arayüz metni sıfır. İki dilde ana akışlar, araç ipuçları, erişilebilir adlar ve hata yolları kontrol edilmeli. Uzatılmış deneme metinleriyle taşmalar bulunmalı; dil değişimi kayıtlı belgeyi değiştirmemeli. Anahtar eşitliği testi tek başına yeterli kabul edilmemeli.

## Performans bulguları ve çalışma sırası

16 Ekim tarihli üretim derlemesi ve 25 test dosyasındaki 205 test başarılı. Derlemede büyük paket uyarıları sürüyor:

| Çıktı | Küçültülmüş boyut | Gzip boyutu |
| --- | --- | --- |
| Teknoloji ikonları | 1.523,30 kB | 465,62 kB |
| Grafik yerleşimi paketi | 738,64 kB | 189,32 kB |
| Ana editör yerleşimi | 297,12 kB | 70,69 kB |

PWA önbellek listesi 151 kayıt ve 10.922,94 KiB içeriyor. Bunlar üretilmiş dosya ve önbellek boyutlarıdır; tamamının ilk ekranın zorunlu indirmesi olduğu anlamına gelmez. Ağ izinde başlangıç rotasının bağımlılık zinciri ayrıca ölçülmeli.

Mevcut geliştirme ölçüm sayfasında 1440 × 900 görünümle iki saniyelik tek örnekler alındı. Veri 20 katılımcı, bir bölüm, paralel bağlantılar ve gidiş dönüş adımları içeriyor:

| Görünüm | Adım | Ortalama FPS | p95 kare aralığı | 33 ms üstü kare |
| --- | --- | --- | --- | --- |
| Serbest | 250 | 73,0 | 32,8 ms | 7 |
| Serbest | 1.000 | 29,9 | 158,5 ms | 12 |
| Sıralama | 1.000 | 111,5 | 9,0 ms | 1 |

Bu kısa geliştirme örnekleri cihazlar arası garanti veya üretim ölçümü değildir. Ortalama FPS'nin yüksek olduğu 250 adımlı örnekte bile kare gecikmeleri var. Öncelik ortalama FPS kadar p95 kare süresini iyileştirmek olmalı. Önceki rapordaki sıralama görünümü iyileştirmesi mevcut; serbest görünümün büyük veri darboğazı sürüyor.

1. **Üretim ölçümünü kur:** Küçük, orta ve büyük veri kümelerinde soğuk/sıcak açılış, belge açma, sürükleme, oynatma, konum atlama, içe aktarma ve dışa aktarmayı ölç. Sabit donanım, güç modu ve tarayıcı sürümü kaydet; ısınma sonrası en az beş tekrarla 30 saniyelik örnekler al.
2. **Yükleme sınırlarını düzelt:** `manualChunks` ile dosya ayırmanın yanında gerçek isteğe bağlı yükleme sağla. Üst araç çubuğunun statik dışa aktarma bağımlılıklarını, depolama sürücülerini ve ikon kayıtlarının ilk yükleme zincirini incele. İkonları ihtiyaç anında getir; Excalidraw ve benzeri ağır özelliklerin mevcut tembel yüklemesini koru. PWA'da kabuk ile isteğe bağlı araç/ek dil dosyalarını ayır; çevrimdışı davranışı test et.
3. **Serbest görünümün çizimini iyileştir:** Üretim profiliyle SVG filtreleri, parıltı, etiketler, paralel eğriler ve path ölçümlerini ayır. Görünmeyen öğeler için çizim ve animasyon maliyetini sınırla. Düşük yakınlaştırmada ayrıntıyı azalt. Tüm belgeye abone olan bileşenleri dar veri seçimlerine taşı. Bu yaklaşım [React Flow performans rehberi](https://reactflow.dev/learn/advanced-use/performance) ile uyumludur.
4. **Düzenleme ve bellek maliyetini sınırla:** [Geri alma geçmişi](/Users/barishoku/devel/diagramer/src/store/slices/historySlice.ts) her değişimde tüm belgeyi JSON ile kopyalıyor ve 30 durum tutuyor. Büyük belgede ölç; değişiklik tabanlı geçmiş veya bellek bütçesiyle iyileştir. [Tuval eşitlemesindeki](/Users/barishoku/devel/diagramer/src/components/canvas/hooks/useCanvasSync.ts) yeniden kurulumları ve tekrarlı hiyerarşi hesaplarını profille. Büyük içe aktarma/yerleşim işlerini gerekirse worker'a taşı.
5. **Çıktı uyumluluğunu koru:** Görünür alan optimizasyonu PNG/SVG/video çıktısında eksik öğe üretmemeli. Yakınlaştırma, seçili öğe, oynatma konumu ve belgenin değişiklik durumu çıktı işleminden sonra korunmalı. Canvas/WebGL geçişi, bu daha küçük iyileştirmeler hedefi karşılamazsa ayrı fizibilite işi olmalı.

## Ölçülebilir kabul hedefleri

| Alan | Önerilen yayın hedefi |
| --- | --- |
| Web açılışı | Gerçek ziyaretlerde p75 LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1; mobil ve masaüstü ayrı değerlendirilir. |
| Tuval akıcılığı | Tanımlanan referans masaüstünde 250 ve 1.000 adımlı her iki görünümde 60 FPS hedefi; p95 kare aralığı ≤ 20 ms. |
| Düzenleme tepkisi | Seçme ve özellik değişiminde p95 görünür geri bildirim ≤ 100 ms. |
| Bellek | Sabit senaryoda aç/kapat ve oynat/durdur tekrarlarında sürekli büyüme olmaması; büyük belge geçmişi için ölçülmüş bir bütçe. |
| Yerelleştirme | TR/EN ana akış, hata, tooltip, erişilebilir ad ve çıktı kontrollerinde kapsam eksiksiz; anahtar/parametre hatası sıfır. |
| Erişilebilirlik | Ana akışlar klavyeyle tamamlanır; görünür odak, yerelleştirilmiş erişilebilir ad ve tutarlı modal odağı bulunur. |
| Görsel tutarlılık | İki dilde ve desteklenen temalarda belirlenen genişliklerde kesilen temel kontrol, çakışma ve okunamayan durum kalmaz. |

Web açılış eşikleri [Core Web Vitals](https://web.dev/articles/vitals) ölçütlerine dayanır. Tuval, tepki ve bellek hedefleri YADA için önerilen ürün bütçeleridir; mevcut sürümün sağladığı sonuçlar değildir. Diyalog davranışları [W3C modal dialog örüntüsü](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) üzerinden doğrulanmalı. INP, kesintisiz tuval animasyon kalitesinin yerine kullanılmamalı.

## Teslim sırası ve yayın koşulları

İlk teslim ölçüm tabanı, geçersiz tarih, depolama açıklaması ve doğrulanmış sabit dil metinleri olmalı. İkinci teslim ortak kontroller ve merkezi çeviri katmanı; üçüncü teslim masaüstü ve dar ekran editör düzeni olmalı. Performans çalışmaları ölçüm tabanından sonra ilerlemeli ve her değişiklik aynı veriyle öncesi/sonrası karşılaştırılmalı. Son teslim tüm temalarda, iki dilde ve hedef platformlarda kabul turudur.

Yeni katılan 5 kullanıcıyla örnek açma → bileşen ekleme → bağlantı/adım oluşturma → oynatma → kaydetme/paylaşma görevleri denenmeli. Önerilen UX hedefi, en az 4 kişinin örnek akışı yardım almadan 2 dakika içinde oynatabilmesi ve temel düzenleme görevlerini tamamlayabilmesidir. Bu küçük çalışma yön gösterir; kullanıcı kitlesinin tamamını temsil ettiği varsayılmamalı.

Yayın öncesinde mevcut `.dproj` dosyalarının açılması, geri al/ileri al, gidiş dönüş zamanlaması, Mermaid koruması, tüm öğeleri içeren PNG/SVG çıktısı ve başarısız kayıttan kurtarma birlikte doğrulanmalı. Gerçek Tauri kapatma ve Forge/Data Center kayıt kontrolleri ortam erişimiyle tamamlanmalı. Görsel yenileme dosya biçimini ve simülasyon anlamlarını değiştirmemeli.


## İlk uygulama teslimi

16 Ekim 2026 tarihinde P0 ölçüm altyapısı ve kayıt koruması ile P1 ortak kontrollerin ilk bölümü uygulandı. Bu teslim tüm planın tamamlandığı anlamına gelmez.

- Ayrı üretim performans derlemesi ve önizleme komutları eklendi. Ölçüm aracı 1 saniye ısınma, 30 saniye ve 5 tekrar varsayılanıyla çalışıyor; görünmeyen sekme örneklerini reddediyor. Üretim React profiler değerleri desteklenmediği için boş olarak raporlanıyor. İlk kısa üretim kontrolü ölçüm döngüsünün çalıştığını doğruladı; kapsamlı referans cihaz ölçümü bekliyor.
- Tauri pencere kapatma koruması ortak kayıt koordinatörüne bağlandı. Kayıt hatası, kayıt sırasında yeni değişiklik ve yinelenen kapatma isteği durumlarında pencere açık kalıyor. Ana pencere için gereken kapatma izinleri eklendi. Gerçek masaüstü kaydet/kapat testi ve canlı Confluence doğrulaması yayın koşulu olarak açık.
- Ortak Button ve Dialog bileşenleri eklendi. Genel onay/bilgi pencereleri ve çalışma alanı silme onayı taşındı. İptal varsayılan odağı, klavye dolaşımı, Escape, erişilebilir ad/açıklama ve odağın geri dönmesi destekleniyor. Diğer modallerin taşınması sonraki teslimin işi.
- Merkezi çeviri erişimi, tarih biçimleme, parametreli metin ve depolama açıklaması yardımcıları eklendi. Geçersiz tarih, yükleme metni, örnek rozeti/bağlantısı, içe aktarma menüsü, bağlantı ipucu ve Studio katman araçlarının doğrulanmış dil kaçakları giderildi. Sayfa dili seçili dille eşleşiyor.
- Anahtar eşitliği, boş çeviri ve parametre uyumluluğu otomatik kontrol ediliyor. Bu kontroller tam arayüz kapsamı yerine geçmiyor; kalan bileşen içi sözlükler ve dışa aktarılan oynatıcı kontrolleri henüz taşınmadı.

Doğrulama: 28 test dosyasında 218 test başarılı; TypeScript, uygulama üretim derlemesi, ayrı performans derlemesi ve kilitli çevrimdışı Rust kontrolü başarılı. Temiz yerel üretim adresinde iptal odağı, ileri/geri Tab döngüsü, Escape ve açan düğmeye odak dönüşü doğrulandı. TR/EN yükleme ve sayfa dili, yerelleştirilmiş tarih/depolama metinleri ve üretim ölçüm çıktısı kontrol edildi. PWA eski sürümü önbellekten sunabildiği için son arayüz kontrolü ayrı bir yerel adreste yapıldı; sürüm güncelleme deneyimi sonraki yükleme/önbellek çalışmasında ele alınmalı.

Sonraki uygulama sırası: tüm modaller ve çeviri alanlarının ortak altyapıya taşınması; dar ekran panel düzeni ve üst araç çubuğu; üretim profiline dayalı büyük serbest diyagram ve yükleme optimizasyonları. Premium UI, eksiksiz TR/EN ve performans hedefleri değişmedi.

## İkinci uygulama teslimi

16 Ekim 2026 tarihinde kalan uygulama metinleri ve modal geçişleriyle birlikte dar ekran panel düzeni ve araç çubuğu uygulandı. İlk teslimin sonunda belirtilen çeviri/modal ve mobil düzen işleri bu teslimle ilerletildi; performans hedeflerinin sağlandığı henüz iddia edilmiyor.

- Bileşen içi TR/EN metinler tür güvenli merkezi kataloglara taşındı. Araç ipuçları, hata metinleri, erişilebilir adlar, React Flow kontrolleri, Studio seçenekleri ve dışa aktarılan iki HTML oynatıcının kontrolleri kapsama alındı. Sayı, süre ve oynatma hızı seçili dile göre biçimleniyor. Kayıtlı kullanıcı adları, notlar ve teknik protokol değerleri korunuyor; yeni diyagramın varsayılan adı yerelleştiriliyor.
- Uygulama modalleri ortak native dialog yüzeyine taşındı. Odak döngüsü, açan kontrole dönüş, Escape ve iç içe modal davranışı ortaklaştırıldı; form etiketleri alanlarla ilişkilendirildi. Çizim editöründeki kaydedilmemiş değişiklik onayı da ortak pencereyi kullanıyor; iptal çizim editörünü açık tutuyor.
- 1.024 piksel altındaki editörde kütüphane, özellikler ve zaman çizelgesi tek tek açılan paneller oldu. Tuval kapalı panellerin genişliğini kullanıyor. Mobil dokunma ve klavyeyle bileşen ekleme destekleniyor. Özellik paneli uygulanmadan kapatılırsa önizleme geri alınıyor. Masaüstü zaman çizelgesi ayırıcısı klavyeyle ayarlanabiliyor.
- Üst araç çubuğunda temel görünüm ve panel kontrolleri korunurken gelişmiş işlemler etiketli bir araç menüsüne toplandı. Açık/seçili durumlar erişilebilir olarak bildiriliyor; dar ekran kart eylemleri dokunmada görünür kaldı. Ortak modal ölçüleri, odak görünürlüğü ve hareket azaltma desteği premium görsel düzenle birlikte korundu.
- Anahtar/parametre eşitliğine ek olarak katalog dışındaki sabit JSX arayüz metinlerini yakalayan kapsam testi eklendi. İki dilde HTML oynatıcı üretimi ve özellik formu etiket ilişkileri kontrol ediliyor. Marka, birim ve teknik standartlar açık istisnalar olarak tutuluyor.

Doğrulama: 32 test dosyasında 231 test başarılı; web, Forge ve Data Center üretim derlemeleri başarılı. Yerel üretim önizlemesinde TR/EN, 390/768/1.024/1.440 piksel genişlikleri, panel açma/kapama, dokunmaya karşılık gelen bileşen seçimi, klavyeyle ekleme, modal içinden modal açma, Escape/odak dönüşü, özellik önizlemesini geri alma ve Excalidraw yükleme/kapatma/iptal akışları kontrol edildi. Temel sayfa ve araç çubuğu yatay taşma üretmedi. Bu kontroller gerçek mobil cihaz ve tüm tema kombinasyonlarının yayın kabul turunun yerine geçmez.

Sonraki öncelik: üretim profiliyle büyük serbest diyagramın kare süreleri, başlangıç bağımlılıkları ve PWA önbellek maliyeti. Büyük paket uyarıları sürüyor; son web PWA listesi 154 kayıt ve 10.991,33 KiB. Bu değer ilk ekran indirme boyutu değildir. Gerçek Tauri kapatma, canlı Forge/Data Center kayıt akışları ve referans cihazdaki tekrarlı performans ölçümleri açık yayın koşullarıdır.

## Üçüncü uygulama: yükleme ve büyük diyagram ölçümü

16 Ekim 2026 tarihinde üretim öncesi/sonrası ölçümleri ve yükleme sınırları uygulandı. Başlangıç JavaScript bağımlılık zinciri 3.321.427 → 560.782 bayt (%83,1 azalma); açılış ekranı dahil 3.393.826 → 631.265 bayt (%81,4 azalma). Bunlar statik derleme dosyalarının toplamıdır; ağ aktarımı, CSS/fontlar veya açılış süresi değildir. `npm run analyze:bundle` ile yeniden hesaplanabilir.

İkon varyantları, dışa aktarma araçları, host görüntüleyicisi, içe aktarma ayrıştırıcıları ve otomatik yerleşim kullanım anına ayrıldı. Kapalı ikon kataloğu çizilmiyor; çıktı yakalama seçili ikonların yüklenmesini bekliyor. PWA önbelleği 10.991,33 → 9.604,74 KiB oldu. İkonlar kullanımda önbelleğe alındığı için daha önce yüklenmemiş bir varyant ilk kullanımda bağlantı gerektiriyor; çevrimdışı ve eski PWA güncelleme kabul turu açık.

1.000 bağlantı için paralel bağlantı hazırlığı ortak belge indeksine taşındı. Saf CPU karşılaştırmasında eski ortanca 232,413 ms; yeni indeks kurma ve sorgulama 1,110 ms, sonraki sorgular 0,037–0,096 ms. Bu sonuç belge açma süresi veya FPS değildir. Kübik parçacık yollarının hesabındaki SVG sorguları azaltıldı; diğer yol türleri mevcut SVG hesabını koruyor. Host görüntüleyicisinin oynatması ortak, seyrek store güncelleyen saate bağlandı. TR/EN hata geri bildirimi, kaydedilmiş belge ve görsel stiller korunuyor.

**Oynatma hedefi açık:** 1.000 adım, 1440 × 900, beşer 30 saniyelik üretim örneğinde ortanca FPS 18,2 → 17,8 ve p95 kare aralığı 133,3 → 141,7 ms. Bu turda oynatma hızlanması doğrulanmadı. Görsel efektleri veya parçacık katmanını değiştiren, kalıcı fayda göstermeyen denemeler tutulmadı. Sonraki öncelik tarayıcı çizim izinde SVG boyama/birleştirme ile JavaScript maliyetini ayırmak; görünürlük/ayrıntı azaltma ya da farklı çizim katmanı için stil ve çıktı eşitliğini ölçmek.

34 dosyada 239 test, web/Forge/Data Center üretim derlemeleri başarılı. Üretimde Türkçe açılış, yeni varsayılan ad, klavyeyle bileşen ekleme ve ihtiyaç anında PostgreSQL ikonu seçme doğrulandı. SVG dosya indirme otomasyonu yanıt vermediği için dosya teslimi kabulü doğrulanmış sayılmadı. Ayrıntılar ve yöntem sınırları `evaluation.md` içinde; ham ölçümler `performance/2026-10-16/` altında.

## Güncel kalan işler — büyük diyagram simülasyonu ertelendi

Kullanıcının son yönlendirmesiyle büyük serbest diyagramın oynatma darboğazı, SVG çizim profili ve buna bağlı renderer değişikliği şimdilik ertelendi. Bu hedef tamamlanmış sayılmıyor; aşağıdaki sıranın dışında tutuluyor. Önceki teslimlerde tamamlanan çeviri katalogları, modal altyapısı, mobil paneller, araç çubuğu ve yükleme sınırları yeniden geliştirme işi olarak açılmamalı.

1. **P0 — Kayıt ve çıktı kabulü:** Gerçek Tauri kaydet/kapat ve hata sonrası açık kalma; canlı Forge/Data Center kaydet/aç; eski `.dproj`, geri al/ileri al, Mermaid ve gidiş dönüş uyumluluğu. Yarım kalan SVG dosya teslimi ile PNG/SVG/video çıktılarının bağımsız açılması ve işlem sonrası durum korunması birlikte kontrol edilmeli. Canlı platform doğrulaması ilgili ortam erişimine bağlı.
2. **P1 — Premium UI altyapısının kalan kısmı:** Ortak Button/Dialog sonrasında Input, Select, Menu, Tooltip, Tabs, Toast ve EmptyState davranışlarını birleştirmek; renk/ölçü kurallarını, küçük metinleri ve tüm temalarda kontrastı tamamlamak. Fontlar hâlâ Google Fonts üzerinden geliyor; Türkçe karakter içeren ana fontları yerelden sunmak ve çizim fontlarını ilgili araçta yüklemek açık.
3. **P1 — Başlangıç ve editör UX:** Boş başla/örnek/içe aktar önceliğini sadeleştirmek; boş tuvalde bileşen → bağlantı → adım → oynatma yönlendirmesi; diyagram gezgini ve bileşen kütüphanesinin ayrıştırılması; zaman çizelgesinde oynatma ile zamanlama düzenlemenin okunur ayrımı.
4. **P1 — Yükleme, çevrimdışı kullanım ve düzenleme ölçümleri:** Eski PWA sürümünden güncelleme, önbellekteki/olmayan ikonlar ve bağlantı geri geldiğinde toparlanma; gerçek soğuk/sıcak açılış ve LCP/INP/CLS ölçümleri. Belge açma, düzenleme, geri alma geçmişi ve bellek maliyeti henüz kapsamlı ölçülmedi. Bunlar ertelenen simülasyon FPS çalışmasından ayrı.
5. **P1 — İki dil ve erişilebilirlik kabul turu:** TR/EN terim tutarlılığı, Türkçe I/İ/ı/i araması, uzun metin taşmaları, hata yolları, ekran okuyucu ve klavye kullanımı. Tüm desteklenen temalarda 390/768/1024/1440 px ve gerçek telefon/tablet doğrulaması; dil değişiminin kullanıcı içeriğini değiştirmediğinin uçtan uca kontrolü. Otomatik katalog testleri mevcut; bu madde ürün kabulüdür.
6. **P1 — Kullanılabilirlik kontrolü:** Beş yeni kullanıcıyla örnek açma → düzenleme → oynatma → kaydet/paylaş görevleri; bulgulara göre son rötuşlar.
7. **P2 — İleri üretkenlik:** Komut arama, özelleştirilebilir panel düzeni ve kısayol keşfi. Ana kalite kabulünden sonra, ayrı kapsam.

Önerilen sonraki geliştirme paketi: ortak form/menü kontrolleri, tipografi ve yerel fontlar; ardından başlangıç/boş tuval akışı. Kayıt/çıktı kontrolleri bu değişikliklerle birlikte yürütülmeli; ortam gerektiren kabul işleri ayrıca izlenmeli.

## Dördüncü uygulama teslimi — ortak kontroller ve başlangıç deneyimi

16 Ekim 2026 tarihinde kullanıcının seçtiği ortak kontrol, tipografi, yerel font ve başlangıç/boş tuval paketi uygulandı. Büyük diyagram simülasyonu kapsam dışında tutuldu.

- Input, Textarea, Select, Field, IconButton, Menu, Tooltip, Tabs, Toast ve EmptyState ortaklaştırıldı; mevcut Button/Dialog altyapısına bağlandı. Form etiketleri, açıklama/hata ilişkileri, klavye menü dolaşımı, sekme odağı, yükleniyor/devre dışı durumları ve dar ekranda kontrol ölçüleri standartlaştırıldı. Genel form alanları taşındı; çizime özgü geometri ve yerel seçim kontrolleri korundu.
- Küçük yardımcı metinler büyütüldü. Altı temanın ana eylem renkleri beyaz metinle en az 4,5:1 kontrast verecek şekilde düzenlendi. Bu ölçüm tüm arayüzün erişilebilirlik sertifikası değildir; tema kabul turu aşağıda açık kalıyor.
- Outfit ve Plus Jakarta Sans Latin/Latin Extended fontları, lisanslarıyla birlikte yerelden sunuluyor. Caveat/Kalam çizim ihtiyacında yükleniyor. Ana fontlar PWA kabuğunda; çizim fontları kullanımda önbelleğe alınıyor. İki HTML oynatıcının UI fontları çıktıya gömülüyor. İlk kez çevrimdışı kullanılacak çizim fontunun önceden önbelleğe alınması gerekiyor.
- Giriş ekranında yeni diyagram, düzenlenebilir örnek ve içe aktarma önceliklendirildi. Adlandırılmış çalışma alanı formu, son çalışmalar ve depolama açıklaması yeni düzene taşındı; eski tarih alanları için geçerli tarih geri dönüşü eklendi.
- Boş tuvalde bileşen ekleme → bağlama → oynatma yönlendirmesi var. İstek akışı örneği üç bileşen ve iki gidiş dönüş adımıyla tek geri alınabilir işlem olarak ekleniyor. Mevcut içerik, salt okunur/önizleme/ortak çalışma sınırları korunuyor. Gezgin bileşenler ve diyagramlar olarak ayrıldı; Türkçe arama yerel harf kurallarını kullanıyor.
- Yeni çalışma alanı önceki belgenin geri alma geçmişini taşımıyor. Cmd/Ctrl+Shift+Z ileri alma düzeltildi; açık modal/menü içinde arka plandaki belge kısayolları engelleniyor. Yeni metinler merkezi TR/EN kataloğuna ve kapsam kontrolüne dahil.

Doğrulama: **36 dosyada 247 test başarılı; web, Forge ve Data Center üretim derlemeleri başarılı.** Yerel üretim önizlemesinde TR/EN, 390 ve 1440 px, Nord ve aydınlık görünüm, menü/sekme klavyesi, modal başlangıç odağı, Türkçe arama, örnek ekleme/geri alma/ileri alma/oynatma ve yeni çalışma alanının boş geçmişi kontrol edildi. Çizim fontlarının başlangıçta istenmediği, el çizimi açıldığında yerel CSS üzerinden yüklendiği doğrulandı. Derleme çıktılarında yerel fontlar ve hostlara uygun göreli bağlantılar kontrol edildi. Son web PWA listesi 200 kayıt / 9.935,31 KiB; bu toplam ilk ekran ağ aktarımı değildir. Büyük isteğe bağlı paket uyarıları devam ediyor.

**Güncel sıra:** Yukarıdaki kalan işler listesinin ortak kontroller/yerel fontlar maddesi ve başlangıç/boş tuval/gezgin bölümü teslim edildi. Zaman çizelgesinde oynatma ile zamanlama düzenlemenin ayrımı halen açık. Sonraki paket kayıt/çıktı kabulü ve PWA güncelleme/çevrimdışı akışları; ardından gerçek açılış/düzenleme/bellek ölçümleri, tüm tema/iki dil/gerçek cihaz/ekran okuyucu kabulü ve kullanıcı görev testi. Canlı Tauri/Forge/Data Center doğrulamaları ile bağımsız PNG/SVG/video dosya açma kontrolleri tamamlanmış sayılmıyor. Büyük simülasyon darboğazı ertelenmiş durumda.

## Beşinci uygulama teslimi — kayıt, çıktı ve PWA güvenilirliği

16 Ekim 2026 tarihinde yerelde doğrulanabilen kayıt/çıktı akışları ile PWA güncelleme ve çevrimdışı kullanım paketi uygulandı. Premium kontrol yüzeyleri ve merkezi TR/EN katalogları kullanıldı; büyük diyagram simülasyonu çalıştırılmadı veya değiştirilmedi.

- **Kayıt ve masaüstü:** Mevcut kayıt koordinatörü ve kapatma koruması tekrar doğrulandı. Güncel ön yüzle imzasız debug Tauri uygulaması derlenip açıldı. Ayrı `YADA kabul – kayıt 2026-10-16` çalışma alanında örnek eklendi, pencere kapatıldı ve belge yeniden açıldı; diskte ve arayüzde üç bileşen/iki adım korundu. Kayıt hatası, kayıt sırasında yeni değişiklik ve yinelenen kapatma durumları otomatik testlerle kapsanıyor; gerçek disk doluluğu/izin hatası masaüstünde enjekte edilmedi. Canlı Forge/Data Center ortamı olmadığı için sunucu üzerinde kaydet/aç kabulü açık.
- **PNG/SVG:** Çıktı için sığdırma işlemi artık gerçek önceki görünümü geri yüklüyor. Üst araç çubuğundaki erken/tekrarlı sığdırma kaldırıldı. Önceki inline display değeri ve önceliği korunuyor; çakışan gizleme işlemleri sayılıyor. Görüntü yakalama sırasında oynatma duraklatılıp konumu ve önceki oynatma durumu geri getiriliyor. SVG/PNG hataları çağıran yerelleştirilmiş hata penceresine ulaşıyor; sessiz başarı gibi davranılmıyor. PNG zaman aşımı sayacı işlem bitince temizleniyor.
- **Bağımsız dosyalar:** Üretim arayüzünden SVG (901.531 bayt), PNG (227.753 bayt) ve kısa DOM video (118.472 bayt) indirildi. Görüntüler bağımsız açılıp üç bileşen ve bağlantılar görüldü. PNG/SVG gömülü mantıksal verileri eşit; Türkçe adlar ve iki adım korunuyor. SVG öncesi/sonrası gerçek tuval dönüşümü aynı. MP4 tarayıcıda 1.252 × 336, 3,1 saniye, hazır durum 4 ve hata olmadan açıldı. Bunlar küçük referans belgenin kabul sonuçlarıdır; her karmaşık belge ve kodlayıcı kombinasyonunun garantisi değildir.
- **Proje arşivi:** Üretim menüsünden `.dproj` indirildi. Bu gerçek dosya regresyon fikstürü olarak içe aktarma fonksiyonundan geçiriliyor; adlar, bağlantılar, gidiş dönüş ve zamanlamalar korunuyor. İki zarf yapısı (`logicalData/visualData`, `logical/visual`) test ediliyor. Bozuk belge JSON'u artık çalışma alanı veya bileşen yazılmadan reddediliyor. UI dosya seçme otomasyonu tarayıcı eklentisinin yerel dosya izni nedeniyle engellendi; izin değiştirilmedi. Dolayısıyla UI üzerinden arşiv yükleme tamamlandı diye raporlanmıyor.
- **PWA güncellemesi:** Otomatik güncelleme yerine bekleyen sürüm bildirimi ve “Kaydet ve güncelle” eylemi var. Etkinleştirme ve sayfayı yeniden açma öncesinde kayıt ayrı ayrı doğrulanıyor; hata veya yeni değişiklik varsa açık belge korunuyor. Bileşen düzenleyicisi, içe aktarma önizlemesi ve canlı ortak çalışma sırasında güncelleme engelleniyor. Diğer sekmeler zorla yenilenmiyor. Gerçek bekleyen worker etkinleştirildi; diğer sekmedeki doldurulmuş form taslağı açık kaldı. Süre aşımı/hata geri bildirimi ve yeniden deneme var. Üretim sürümünden yükseltme için staging kabulü ayrıca gerekli; önceki sürümün hashed dosyaları dağıtım sırasında bir süre tutulmalı.
- **Çevrimdışı akış:** Chrome ağ emülasyonunda bağlantı kesilme bildirimi, önbellekten yeniden açılan kayıtlı diyagram ve bağlantı geri geldi bildirimi kontrol edildi. Ağın geri gelmesi güncelleme kontrolünü tetikliyor; eksik ikon yükleri tekrar deneniyor ve gerekirse kayıt korumalı yenileme sunuluyor. Önceden yüklenmemiş isteğe bağlı ikon/fontlar ile bulut/paylaşım için bağlantı gerektiği iki dilde açıklanıyor. İkon/font çevrimdışı kombinasyonlarının tamamı fiziksel cihazda denenmedi. Görüntü/video/arşiv URL'lerinin uygulama başlangıcına yönlendirilmesi engellendi; SVG'nin PWA kapsamı altında bağımsız açılması doğrulandı.
- **Host ayrımı:** Forge/Data Center çıktısında worker üretimi kapatıldı; Tauri ve iframe oturumları web worker kaydetmiyor. Bu ortamların yaşam döngüsü kendi hostunda kalıyor.

Doğrulama: **39 dosyada 259 test başarılı; web, Forge ve Data Center üretim derlemeleri başarılı.** İmzasız debug Tauri uygulaması da derlendi ve yerel kaydet/kapat/yeniden aç kontrolünde kullanıldı. Son web önbelleği 198 kayıt / 9.940,66 KiB; bu ilk ekran aktarım ölçümü değildir. Büyük isteğe bağlı paket uyarıları sürüyor. Yeni güvenilirlik metinleri TR/EN anahtar ve parametre sözleşmesine dahil.

**Kalan öncelikler:** Canlı Forge/Data Center kayıt/aç ve gerçek hata kabulü; üretimdeki önceki PWA sürümünden staging yükseltmesi; UI dosya yükleme ve karmaşık belge çıktı kabulü. Sonraki geliştirme paketi gerçek soğuk/sıcak açılış, düzenleme/geri alma/bellek ölçümleri ve zaman çizelgesi düzenleme açıklığı. Ardından tüm tema/iki dil/ekran okuyucu/gerçek cihaz kabulü ve yeni kullanıcı görev testi geliyor. Büyük diyagram simülasyonunun darboğazı kapsam dışında kalıyor.


## Altıncı uygulama teslimi — açılış, geçmiş belleği, timeline ve kompakt kontroller

16 Ekim 2026: büyük diyagram simülasyonu kapsam dışında tutularak düzenleme ve ana sayfa açılışı ölçüldü. Ayrıntılı yöntem, ham veriler ve sınırlamalar [ölçüm raporunda](performance/2026-10-16/editing-and-startup.md).

- Geçmiş kayıtlarında değişmeyen varlıkların savunmalı kopyaları paylaşılır. Kaynak veride yerinde değişiklik algılanır, önceki kayıt korunur. 30 geri alma sınırı/ileri alma dallanması sürer. 250 düğümlü düzenleme ölçümünde ek geçmiş belleği 9.935 → 949 KiB; düzenleme medyanı 0,506 → 0,204 ms, geri alma 0,788 → 0,419 ms. Store'a veri yükleme 0,501 → 0,554 ms; bu işlemde hızlanma gözlenmedi.
- Geçmiş temizlenince kopya önbelleği sıfırlanır; fullscreen dinleyicileri tarayıcı ve Tauri'de kapatılır, gecikmiş kurulum iptal edilir. Altı düzenle/kapat döngüsünde ölçülen yığın sabitlenir. Bütün uygulama için sızıntı garantisi verilmez.
- Ana sayfada kısa Suspense beklemesi kaldırıldı; host/native sürücüleri ve ZIP/görüntü/paylaşım işlemleri ihtiyaç anında yüklenir. Yerel profil derlemesinde beş sıcak yenilemenin başlık medyanı 347 → 43,5 ms; LCP 372 → 60 ms. Ana sayfanın statik JS grafiği yaklaşık 638 → 500 KB. Bunlar gerçek kullanıcı veya toplam ağ aktarımı ölçümleri değildir; profil derlemesinde PWA kurulumu kapalıdır.
- Timeline'da “Akışı izle / Preview flow” ve “Zamanlamayı düzenle / Edit timing” ayrıldı. İzleme sırasında sürükleme ve silme kapalı; seçili adımın uçları/zamanlaması görünür. Not zamanlama hareketleri tek geri alma kaydı oluşturur; Escape/pointer iptali değişikliği bırakmaz. Timeline abonelikleri tüm görsel veri yerine gereken alanları izler.
- Kullanıcının kompakt kontrol isteği doğrultusunda ortak butonlar masaüstünde 32 px, mobilde 36 px; ikonlar masaüstünde 30 px. Menü, sekme ve form dolguları azaltıldı. Header 56 → 44 px; paylaşım, stüdyo ve içe aktarma önizlemesi başlıkları da aynı ölçüye çekildi. Kitaplık satırları daraltıldı. Timeline görünüm eylemleri açıklamalı ikonlar kullanır; mobil hız kontrolü tek seçiciye toplandı. Mobil girişlerde 16 px yazı ve tüm kontrollerde odak göstergeleri korundu. Yeni metinler merkezi TR/EN kapsam testine dahil.

Doğrulama: **45 dosyada 275 test başarılı; web, Forge, Data Center ve imzasız debug Tauri derlemeleri başarılı.** Tarayıcıda kompakt düzenin masaüstü/mobil ve TR/EN kabulü bu paketin ekran kayıtlarıyla belgelendi. Gerçek host ve fiziksel cihaz kabulü tamamlanmış sayılmıyor.

**Kalan öncelikler:** Canlı Forge/Data Center kaydet/aç ve hata kabulü; üretimdeki önceki PWA sürümünden staging yükseltmesi; UI dosya yükleme/karmaşık çıktı kabulü; kayıtlı belgenin diskten açılış ölçümü; tüm tema/iki dil/ekran okuyucu/gerçek cihaz kabulü ve yeni kullanıcı görev testi. Büyük diyagram simülasyonu ertelenmiş durumda.


## Yedinci uygulama teslimi — tüm temalarda kompakt UI ve erişilebilirlik

17 Ekim 2026 tarihinde altı tema, TR/EN ve mobil/masaüstü için 24 kombinasyon kontrol edildi; tercihler, ana sayfa ve örnek diyagramın 72 yüzey kaydı alındı. 360/390/768 px ve yatay ekran ek kontrolleri, açık timeline/kitaplık/araçlar, çizim kontrolleri, Mermaid ve entegrasyon formu incelendi. Ayrıntılar ve ekranlar [kabul raporunda](performance/2026-10-17/compact-accessibility.md).

- 320 px header çakışması, soldan kesilen araçlar menüsü ve menünün önüne çıkan tuval kontrolleri düzeltildi. Çok dar ekranda görünüm anahtarları ve mobil tam ekran eylemi araçlar menüsünde; 44 px header korunuyor. Çizim ve seçim araçları ekran sınırında satıra kırılıyor.
- Eski dolu butonlara ortak tema kontrastı uygulandı. Nord/Dracula/Synthwave ana butonlarının beyaz yazı oranları 4,5 üzerinde; altı tema için test var. Soluk aydınlık tema metinleri koyulaştırıldı. Küçük hedefler en az 24 px; timeline kaydırıcısının görsel çizgisi ince, etkileşim alanı daha yüksek. Ana buton ölçüleri kompakt kaldı.
- Dialog odak döngüsü negatif tab sırasını ve devre dışı kontrolleri dışarıda bırakıyor. Tercihler tab/tabpanel ve ok/Home/End davranışı kullanıyor. Dışa aktarma açık durum/ilk odak/Escape/modalden dönüş akışları düzeltildi. Aktif profil alanı etiketlendi; çizim renk/kalınlık açıklamaları ve seçili durumları TR/EN tamamlandı.
- Hızlı aç/kapat kontrolünde bulunan gecikmiş sığdırmanın ana sayfayı değişmiş işaretleme hatası belge sahipliğiyle engellendi. Azaltılmış hareket tercihi açılış sığdırması ve UI geçişlerinde gözetiliyor. Simülasyon kapsamına girilmedi.

Doğrulama: **48 dosyada 287 test; web, Forge, Data Center ve imzasız debug Tauri derlemeleri başarılı.** Son matris ve ek genişliklerde seçilen yüzeylerde yatay taşma/çakışma/adsız kontrol/küçük hedef bulunmadı. Yerel üretim önizlemesi ayrıca kontrol edildi.

**Kalan kabul işleri:** Fiziksel mobil cihaz kontrolü; tüm içerik uzunlukları ve karmaşık belgeler; yeni kullanıcı görev testi. Önceki paketten canlı host kaydet/aç, staging PWA yükseltmesi, UI dosya yükleme/karmaşık çıktı ve kayıtlı belgenin diskten açılış ölçümü açık. Büyük diyagram simülasyonu ertelenmiş durumda. Bu teslim tüm uygulama için erişilebilirlik sertifikasyonu olarak değerlendirilmez.


### Kapsam güncellemesi — 17 Ekim 2026

Kullanıcının isteğiyle ekran okuyucu kabulü (VoiceOver/TalkBack/NVDA) ve buna yönelik özel doğrulama paketi kapsamdan çıkarıldı. Bu kabul tamamlandı olarak işaretlenmez ve sonraki paketlerde zorunlu iş olarak takip edilmez. Temel klavye erişimi, odak davranışı, okunabilirlik, kompakt düzen ve taşma kontrolleri korunur. Premium UI, eksiksiz TR/EN desteği ve büyük diyagram simülasyonunun kapsam dışında olması değişmedi.


17 Ekim 2026: Kullanıcı isteğiyle varsayılan tema **Light** olarak değiştirildi. Web başlangıcı, eksik/geçersiz tercih ve tercih okuma hatası Light kullanır; Tauri'nin yeni kullanıcı varsayılanı da Light oldu. Geçerli kayıtlı kullanıcı tercihi ve mevcut URL tema seçimi davranışı korunur. Mevcut kullanıcıların tema kayıtları topluca değiştirilmez.


## Timeline yeniden tasarımı — 17 Ekim 2026

Kullanıcı geri bildirimi doğrultusunda timeline, seyrek kullanılan gelişmiş zamanlama aracı olarak yeniden düzenlendi. [Araştırma, kararlar, ölçümler ve ekranlar](performance/2026-10-17/timeline-redesign.md).

- İlk açılışta, yeni belgede ve belge değiştirmede panel kapalı. Boş tuvalde oynatma şeridi de yok. Toolbar anahtarı ve yeni küçük Zamanlama girişi paneli isteğe bağlı açar.
- Günlük oynatma tek satıra indirildi: masaüstü 36 px, mobil 40 px. Dört hız düğmesi tek seçici oldu. Büyük mod butonları ve sürekli açıklama/seçimsiz bilgi satırları kaldırıldı.
- Açık editörde 37 px araç satırı; detay yalnızca seçim olduğunda, yardım istenince görünür. Düzenleme küçük bir anahtar kullanır; adım eylemleri seçili satıra taşındı. Satırlar 56 px. Kapalıyken adım DOM'u ve sürükleme dinleyicileri oluşturulmaz.
- Altı tema, TR/EN ve 320/1280 px için 24 kombinasyon; taşma yok. Küçük referansta oynatma, süre düzenleme ve geri alma; yeniden yüklemede kapalı başlangıç doğrulandı. **50 dosyada 297 test; web, Forge, Data Center ve imzasız debug Tauri derlemeleri başarılı.**

Premium tema dili, Light varsayılanı ve TR/EN korundu. Ekran okuyucu kabulü ve büyük diyagram simülasyonu kapsam dışında kaldı. İleri UX adayları adım arama/filtreleme ve kullanıcı görev testidir. Satır içi sayısal düzenleme aşağıdaki teslimle tamamlandı.


## Timeline satır içi zamanlama — 17 Ekim 2026

Seçili adımın süre ve gecikmesi modal açmadan alt detay satırında düzenlenebilir. Enter veya alandan ayrılma uygular; Escape mevcut değere döner. Başka adıma doğrudan tıklamak da taslağı seçim değişmeden önce uygular. Her alanın onayı tek geri alma noktasıdır; Enter ardından blur ek kayıt oluşturmaz. Yazarken zamanlama hesapları çalıştırılmaz.

Virgül ve nokta ondalıkları, sıfır ve küçük kesirler korunur. Geçersiz girişler yerel hata gösterir; aynı alanın veya belgenin eşzamanlı değişmesi eski taslağın üzerine yazmasını engeller. Diğer alanın yeni değeri ve iç işlem/animasyon verileri korunur. Oynatma sırasında alanlar kilitli; salt okunur belgelerde yalnızca değerler görünür. İç işlem ayrıntıları bilgi düğmesiyle açılabilir.

Masaüstü seçim satırı **31 px**, oynatma şeridi **36 px**; mobil seçim alanı iki satır **64 px** ve sayısal girişler 16 px. TR/EN, Light/Dark ve 320 px mobil tarayıcı kontrollerinde taşma bulunmadı. Üretim önizlemesinde modal açılmadan süre/gecikme, adım değişimi, Escape ve geri alma kontrol edildi. **51 dosyada 315 test; web, Forge ve Data Center derlemeleri başarılı.** Fiziksel cihaz kabulü bu teslimin parçası değildir. Büyük diyagram simülasyonu ve ekran okuyucu kabulü kapsam dışında kaldı.

[Ayrıntılı kabul notları ve ekranlar](performance/2026-10-17/timeline-inline.md).


## Tuval bağlantıları: uçlar, oklar ve etiketler — 17 Ekim 2026

İlk tuval paketi tamamlandı. [Kabul raporu ve ekranlar](performance/2026-10-17/edge-rendering.md).

- Büyük mavi yeniden bağlama halkaları yerine 7 tuval birimlik işaretler kullanılır; ayrı, görünmez 24 birimlik sürükleme alanı korunur. Ekleme tutamaçları bağlantı seçilince görünür. Kısa bağlantıda tek orta ekleme noktası, uzun bağlantıda iki nokta vardır.
- Oklar aktiflikte büyümez; kullanıcının temel çizgi kalınlığına göre ölçülen sabit boyutta kalır. Ok ucu bağlantı portuna hizalanır. Temiz ve eskiz görünümünde tek ok katmanı gerçek rotanın teğetini izler; dekoratif eskiz alt yolları ek/yamuk ok üretmez. Başlangıç/bitiş ok şekilleri korunur.
- Etiketler dikey rotanın yanına, yatay rotanın üstüne yerleşir. Uç kartlarla çakışan adayın yerine uygun karşı taraf/komşu konum seçilir. Sayısal etiket konumu korunur. Uzun içerik kısalır; tam içerik ve TR/EN hızlı düzenleme açıklaması tooltip'tedir. Geniş, bütün diyagramı kapsayan etiket yerleşim çözümleyicisi eklenmedi.
- Otomatik aktif çizgi vurgusu sakinleştirildi; kullanıcı tarafından seçilmiş renk, çizgi deseni, gradient ve glow korunur. Node ve parçacık şekilleri bu ilk pakette yeniden tasarlanmadı.
- Kabulde bulunan mevcut protokol hızlı düzenleme hatası düzeltildi: iç işlem parametresi verilmemişse adımın mevcut iç işlemi korunur. Açık boş metinle silme ve sıfır süre desteği devam eder. Örnek akış protokol değişiminden sonra 2.500 ms kalır.

Doğrulama: **54 dosyada 332 test; web, Forge ve Data Center üretim derlemeleri başarılı.** Gerçek renderer/scheduler kullanılan yerel kabul ekranında temiz/eskiz × beş geometri (10 durum), dört ara noktalı rota, beş ok seçeneği, altı tema; seçilen geometrilerde uç kart-etiket çakışması yok. Yeniden bağlama, ara nokta sürükleyerek ekleme ve çift tıkla kaldırma, seçili etiketi çift tıkla düzenleme, %25/%50 etiket konumu ve oynatma kontrol edildi. TR/EN 360 px mobil ve 1100 px masaüstü; sayfa taşması yok. Son üretim önizlemesinde ok katmanları/yerelleştirilmiş etiketler tekrar doğrulandı. Fiziksel cihaz ve native yeniden derleme bu teslimin parçası değildir. Büyük diyagram simülasyonu ve ekran okuyucu kabulü kapsam dışıdır.


## Node durumları, parçacıklar ve görünümü koruyan çıktı — 18 Ekim 2026

Paket tamamlandı. [Kabul raporu, ölçüm ve örnek çıktılar](performance/2026-10-18/node-and-export.md).

- Seçim ince kesikli çizgiye; aktiflik küçük nokta/hafif vurguya, iç işlem küçük yeşil göstergeye indirildi. Kart büyümesi ve kalın aktif halkalar kaldırıldı. Parçacıklar küçültüldü; hareketli tekrar numarası kaldırılarak sabit etikette bırakıldı. Ok dönüşte ters yönü izler. Mevcut düzenleme, zamanlama ve simülasyon verisi korunur.
- PNG/SVG/HTML/video için görünür tuval varsayılanı ve Tüm diyagram kadrajı eklendi. Gerçek canvas fontları, tema, ikon, gölge ve durumları kullanılır. HTML/video ortak sahne yakalamasından üretilir; video tam boyutlu kareleri toplamak yerine sınırlı kuyruk ve yeniden kullanılan canvas ile kodlanır. TR/EN metinler eşleşir.
- Küçük referansın 24 örneğinde 3 görsel durum yakalamak, yakalama süresini **801,3→128,6 ms** düşürdü. 1,5 saniye/1280×608 MP4 kodlama **171,6 ms**; encoder kuyruğu en fazla 4. Bu sonuç büyük diyagram kıyası değildir. Toplam heap ölçülmedi.
- **62 dosyada 362 test; web, Forge ve Data Center derlemeleri başarılı.** Altı tema, gerçek sıralama görünümü, TR/EN HTML oynatıcı, PNG/SVG ve MP4 kontrol edildi. Native/Safari codec kabulü yapılmadı. SVG foreignObject desteği, uzak görsel CORS'u ve video sıkıştırması çıktı eşleşmesinin sınırlarıdır.

Büyük diyagram simülasyonu ve ekran okuyucu kabulü kapsam dışında kalır. Sonraki isteğe bağlı kabul çalışması: farklı tarayıcı/native codec'lerde ve daha zengin görsel içeriklerde çıktı eşleşmesi; GIF'in ortak sahne akışına taşınması ayrı kapsamdır.

## Safari/native çıktı ve connector taşıma düzeltmesi — 18 Ekim 2026

Safari ve gerçek macOS Tauri debug uygulamasında kayıt/çıktı kabulü yapıldı. WebKit değişken fontlarının çıktıda kaybolması ve parçacıkların zoom sonrası çizgiden ayrılması düzeltildi. Video kuyruğu sınırlı tutulur; codec, recorder ve resim yükleme işlemleri sonsuza kadar beklemez, hata/bitişte kaynaklar bırakılır. Native PNG/SVG/HTML/MP4 kaydı; Safari'de çıktı açma, oynatma, adım seçimi, zoom ve TR/EN HTML kontrol edildi. Son native 3 saniyelik video Apple çözücüsüyle açıldı. [Ölçümler, kapsam sınırları ve çıktılar](performance/2026-10-18/safari-native-export.md).

Kullanıcının bildirdiği connector taşıma sorunu ayrıca düzeltildi: yeniden bağlama yeni bağlantı fallback'ine girmez, edge kimliği sabit kalır, kaynak/hedef yönüne uygun bırakma katmanı açılır. Normal ve Freeform node'larda iki uç/dört yön, iptal/geçersiz hedef, aynı port, geri alma/yeniden uygulama ve ardından normal yeni bağlantı oluşturma gerçek canvas'ta doğrulandı. Edge/adım sayısı, süre/gecikme ve metadata korunur. [Kabul raporu ve ekran](performance/2026-10-18/edge-reconnect.md).

Son otomatik kontrol: **66 dosyada 379 test; web, Forge, Data Center ve macOS Tauri debug derlemeleri başarılı**. Büyük diyagram simülasyonu ve ekran okuyucu kabulü kapsam dışında kaldı. Fiziksel dokunmatik cihazda connector taşıma ve diğer işletim sistemlerinde native çıktı kabulü yapılmadı.

## Keskin eğrilerde ok hizası — 19 Ekim 2026

Oklar yalnızca uç noktanın anlık teğetine değil, gövdelerinin kapladığı rota bölümünün geliş açısına hizalanır. Connector'daki uç konumu ve mevcut rota/simülasyon/yeniden bağlama davranışı korunur. Kısa keskin eğri, ters/yatay/diyagonal/loop rotaları ve temiz/eskiz görünümü kontrol edildi. **66 dosyada 383 test ve web üretim derlemesi başarılı.** [Kabul notu ve ekran](performance/2026-10-19/arrow-angle.md).
