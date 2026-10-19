# Kompakt arayüz, tema ve erişilebilirlik kabulü — 17 Ekim 2026

Büyük diyagram simülasyonu bu paketin kapsamı dışındadır. Önceki açılış/geçmiş ölçümleri yeniden çalıştırılmadı.

## Kabul kapsamı

- Altı tema: Light, Dark, Nord, Dracula, Synthwave, Retro.
- TR/EN × 320 × 568 mobil ve 1280 × 720 masaüstü: **24 kombinasyon**. Her kombinasyonda tercihler, ana sayfa ve örnek diyagram; toplam 72 yüzey kaydı.
- Ek olarak 320 × 568, 360 × 640, 390 × 844, 768 × 1024 ve 844 × 390 yatay görünüm: ana kontroller, açık araçlar ve seçili adım/zamanlama düzenleme açık timeline paneli.
- Mobil kitaplık, çizim araçları, Mermaid çıktı penceresi ve entegrasyon formu; modal/sekmeler/menü klavyesi ve odak dönüşü.
- Altı temanın masaüstü ekranları ayrı ayrı görsel olarak incelendi. Ham kayıtlar: [matris](compact-matrix.json), [ara boyutlar/klavye](compact-extended.json), [form ve sekme odağı](compact-form-focus.json), [eski tema kontrolleri](legacy-theme-before.json).

Yatay sınırlar, header kontrol kesişimleri, erişilebilir adlar, küçük kontrol hedefleri ve form etiketleri DOM üzerinden incelendi. Bu kayıtlardaki kontrol kapsamı seçilen UI yüzeyleridir; tuvalde ekran dışında bulunabilen düğümler ve kasıtlı metin kısaltmaları taşma sayılmaz. Dikey içerik gerektiğinde kaydırılır. Matrisin son turunda yatay taşma, kontrol kesişimi, adsız kontrol veya 24 px altı hedef bulunmadı. Geliştirme önizlemesinin ardından normal üretim derlemesi ayrıca kontrol edildi.

## Düzeltilen sorunlar

1. **320 px header:** Kayıt düğmesi göründüğünde görünüm anahtarları panel düğmeleriyle üst üste geliyordu. 360 px altındaki görünüm anahtarları araçlar menüsüne taşındı. Tam ekran eylemi 640 px altında aynı menüde; erişim korunuyor, header 44 px kalıyor.
2. **Menü konumu ve katman:** Araçlar menüsü dar ekranda soldan kesiliyordu; tuvaldeki temizle düğmesi menünün önüne çıkabiliyordu. Mobil menü ekran sınırlarına yerleştirildi, tuvalin katman bağlamı ayrıldı. Çizim/çoklu seçim araçları satıra kırılıyor.
3. **Tema kontrastı:** Eski dolu butonlar ortak okunabilir accent renklerini kullanmıyordu. Beyaz yazıyla Nord 4,03 → 6,22; Dracula 3,70 → 5,92; Synthwave 3,87 → 7,27 kontrast oranına ulaştı. Retro 5,02 oranını korudu. Ortak ana buton renkleri altı tema için en az 4,5 oranıyla test ediliyor. Aydınlık görünümde modal/header içindeki soluk nötr metinler koyulaştırıldı. Bu, uygulamadaki her metnin/çizimin tam kontrast denetimi değildir.
4. **Küçük hedefler:** Timeline kaydırıcısı 4 px görsel çizgiyi korurken 24 px etkileşim yüksekliğine çıkarıldı. Dikey dolgusu azaltılarak alt çubuğun büyümesi önlendi. Kayıt, yardım, renk, kalınlık ve modal içi ikon hedefleri en az 24 px. Mobil ana butonlar 36 px kalıyor; dar timeline ikonları 32 px.
5. **Klavye/etiket:** Ortak dialog döngüsü negatif tab sırasını, disabled fieldset ve iç içe dialogları ayırır. Tercihler gerçek tab/tabpanel ilişkileri ve ok/Home/End tuşlarını kullanır. Son kontrolden Tab, etkin sekmeye döner; etkin olmayan sekmeye gitmez. Aktif profil alanı görünür etiketiyle ilişkilendirildi. Çizim renk/kalınlık adları ve seçili durumları TR/EN sunulur. Ollama isteğe bağlı anahtar yer tutucusu çevrildi.
6. **Dışa aktarma:** Açık durum ve panel ilişkisi bildirilir, ilk eylem odaklanır. Escape açan butona döner; menüden modal açıp kapatınca odak korunur. Liste dar/yatay ekranda dikey kayabilir.
7. **Gecikmiş sığdırma:** Hızlı tema kabulünde tekrarlanabilen hatada, sığdırma bitişi ana sayfaya dönüldükten sonra boş oturumu değişmiş işaretliyordu. Viewport işlemi belge/çalışma alanı sahipliği ve bileşen yaşam döngüsüyle sınırlandı. Kapatılmış, başka belgeye geçmiş ve salt okunur oturumlar regresyon testinde korunuyor. Azaltılmış hareket tercihi açılış sığdırması ve UI geçişlerinde gözetiliyor; simülasyon davranışı değiştirilmedi.

## Doğrulama ve sınırlar

**48 dosyada 287 test başarılı.** Web, Forge, Data Center ve imzasız debug Tauri derlemeleri kontrol edildi. Büyük isteğe bağlı paket uyarıları sürüyor. Yeni TR/EN metinleri mevcut anahtar/parametre sözleşmesine dahil.

Bu kabul yerel Chromium tarayıcısında DOM, görsel inceleme ve gerçek klavye etkileşimlerinden oluşur. Fiziksel iOS/Android, VoiceOver/TalkBack/NVDA, bütün modalların bütün içerik uzunlukları, tarayıcılar arası kabul ve tüm uygulama için erişilebilirlik sertifikasyonu değildir. Azaltılmış hareket desteğinin CSS/JS yolları uygulandı; işletim sistemi tercihi bu kabulde değiştirilmedi. Canlı Forge/Data Center ve gerçek cihaz kabulü açık kalır.

Ekranlar: [Light](theme-light-tr.png), [Dark](theme-dark-tr.png), [Nord](theme-nord-tr.png), [Dracula](theme-dracula-tr.png), [Synthwave](theme-synthwave-tr.png), [Retro](theme-retro-tr.png).


Üretim önizlemesi: 320 × 568 TR/Nord görünümünde header **44 px**, kapalı timeline **74 px**, kaydırıcı hedefi **24 px**, yatay taşma **0 px**. Dar araçlar menüsünün katman/sınırları ve 1280 × 720 EN/Light görünümü ayrıca kontrol edildi. [Mobil](production-mobile-tr.png), [mobil araçlar](production-mobile-tools-tr.png), [masaüstü EN](production-desktop-en.png).
