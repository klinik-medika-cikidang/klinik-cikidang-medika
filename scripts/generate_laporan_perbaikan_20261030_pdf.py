"""Formal report for the clinic owners on the F-019..F-023 change request, with staging screenshots as evidence.

Writes docs/documentation/Laporan-Perbaikan-Sistem-Klinik-2026-10-30.pdf and a copy in the user's Downloads folder.
Run from the repository root: python scripts/generate_laporan_perbaikan_20261030_pdf.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, Spacer

from clinic_pdf_kit import S, boxed, build, bullets, figure, h2, info_grid, table

ASSETS = os.path.join("docs", "documentation", "assets", "2026-10-30")
FILE_NAME = "Laporan-Perbaikan-Sistem-Klinik-2026-10-30.pdf"
OUT_PATH = os.path.join("docs", "documentation", FILE_NAME)
DOWNLOADS = os.path.join(os.path.expanduser("~"), "Downloads", FILE_NAME)
TITLE = "Laporan Perbaikan dan Pembaruan Sistem Klinik"
RUNNING = "Laporan Perbaikan dan Pembaruan Sistem • 30 Oktober 2026"


def img(name):
    return os.path.join(ASSETS, name)


def item(no, title):
    return Paragraph(f"{no}. {title}", S["h3"])


def body(text):
    return Paragraph(text, S["body"])


def story():
    s = []
    s.append(Paragraph(TITLE, S["title"]))
    s.append(Paragraph("Klinik Pratama Cikidang Medika • Tindak lanjut masukan dokter tanggal 27 Oktober 2026", S["subtitle"]))
    s.append(info_grid([
        ["<b>Ditujukan kepada:</b> dr. Ade Sofyan dan dr. Neneng", "<b>Tanggal laporan:</b> 30 Oktober 2026"],
        ["<b>Perihal:</b> 8 perbaikan dan 4 pembaruan fitur", "<b>Status:</b> selesai diuji di sistem uji (staging), menunggu persetujuan untuk diterapkan ke sistem utama"],
    ]))
    s.append(Spacer(1, 6))

    s += h2("1. Ringkasan")
    s.append(body(
        "Masukan dokter tanggal 27 Oktober 2026 kami telaah satu per satu. Hasilnya ada 12 pekerjaan: "
        "<b>8 perbaikan</b> pada fungsi yang sudah ada dan <b>4 pembaruan fitur</b> sesuai permintaan baru. "
        "Seluruhnya sudah selesai dibuat dan sudah diuji di <b>sistem uji (staging)</b>, yaitu salinan aplikasi yang dipakai khusus "
        "untuk pengujian sehingga tidak mengganggu pelayanan harian. Sistem utama yang dipakai klinik setiap hari <b>belum diubah</b>; "
        "perubahan baru diterapkan ke sistem utama setelah dokter menyetujui laporan ini."
    ))
    s.append(Spacer(1, 3))
    s.append(table(
        ["No", "Masukan / kebutuhan", "Yang sudah dikerjakan", "Bukti"],
        [
            ["1", "Kategori ANC gagal disimpan", "Kategori program (Umum, ANC, PTM, KB, 3 Eliminasi) dapat disimpan, pesan galat kini menyebut penyebab sebenarnya", "Gambar 1"],
            ["2", "Dashboard terbuka di \"Semua Periode\"", "Dashboard langsung terbuka di \"Bulan Ini\"", "Gambar 2"],
            ["3", "Angka pendapatan Dashboard berbeda dengan Laporan", "Dashboard, Laporan, Buku Kas, dan Excel memakai satu hitungan yang sama", "Gambar 2, 3, Tabel 2"],
            ["4", "Grafik tren tidak sesuai periode", "Grafik mengikuti periode yang dipilih, totalnya sama dengan kartu angka", "Gambar 4"],
            ["5", "Pasien belum bayar dari hari sebelumnya hilang dari kasir", "Muncul di antrean kasir dengan tanda \"Tunggakan\" dan tanggal periksanya", "Gambar 5"],
            ["6", "Buku Kas perlu dicocokkan dengan sheet DATA", "Dicocokkan per bulan dan per tanggal: 39 dari 39 bulan sama", "Tabel 3"],
            ["7", "Jumlah pasien cadangan yang tidak nyata (4.238)", "Angka cadangan dihapus; bila data gagal dimuat, layar menyatakan gagal", "Keterangan"],
            ["8", "Tanggal \"hari ini\" mundur sebelum pukul 07.00", "Program Khusus dan nama file Excel memakai tanggal WIB", "Keterangan"],
            ["9", "Pengeluaran Klinik dan Non Klinik", "Rekap terpisah di Dashboard, Buku Kas, Laporan, dan Excel", "Gambar 6"],
            ["10", "Pasien membayar di hari berikutnya", "Uang dicatat pada tanggal diterima; sisa piutang dapat dilunasi kemudian", "Gambar 7 s.d. 10"],
            ["11", "Program Khusus hanya menampilkan pasien aktif", "Tampilan awal \"Pasien Aktif\", riwayat lengkap tetap tersedia", "Gambar 11"],
            ["12", "Sisa laci kasir minus di awal bulan", "Ada Saldo Awal laci per bulan yang diisi pemilik", "Gambar 12, 13"],
        ],
        [0.9 * cm, 4.9 * cm, 9.6 * cm, 2.4 * cm],
    ))
    s.append(Paragraph("Tabel 1. Daftar pekerjaan. Nomor 1 sampai 8 adalah perbaikan, nomor 9 sampai 12 adalah pembaruan fitur.", S["caption"]))

    s += h2("2. Cara Pengujian")
    s += bullets([
        "Pengujian dilakukan pada 30 Oktober 2026 di sistem uji (staging), dengan akun Pemilik dan akun Dokter/Admin.",
        "Alur dicoba dari awal sampai akhir memakai dua pasien fiktif: <b>Tn. PASIEN UJI SISTEM</b> dan <b>Ny. PASIEN UJI DUA</b>. "
        "Nama pasien sungguhan yang ikut terlihat di layar sudah kami samarkan demi menjaga kerahasiaan.",
        "Angka Dashboard, Laporan, dan Buku Kas bulan Oktober 2026 dibandingkan dengan perhitungan terpisah langsung dari database. Semuanya sama.",
        "Tampilan diperiksa pada ukuran layar HP (360 piksel), tablet (768 piksel), dan komputer (1024 piksel) di enam halaman utama. "
        "Tidak ada halaman yang harus digeser ke samping, dan label angka tidak terpotong.",
        "Hak akses diperiksa: akun Dokter/Admin tidak dapat membuka Dashboard dan Paket Terapi, dan tidak melihat angka keuangan khusus pemilik.",
        "207 pengujian otomatis pada kode program lulus.",
    ])
    s.append(boxed(
        "Angka pada gambar berasal dari database sistem uji, termasuk data uji yang kami masukkan sendiri (misalnya Saldo Awal Rp 4.000.000). "
        "Angka tersebut <b>bukan</b> laporan keuangan klinik dan dapat berbeda dari sistem utama."
    ))

    s += h2("3. Rincian Perbaikan")

    s.append(item(1, "Kategori ANC dapat disimpan"))
    s.append(body(
        "Penyebabnya, kolom kategori program belum ada di database sistem utama, dan pesan galat sebelumnya hanya berbunyi umum sehingga "
        "penyebabnya tidak terlihat. Kolom tersebut akan ditambahkan saat penerapan ke sistem utama. Pesan galat di seluruh aplikasi kini "
        "menampilkan penyebab yang sebenarnya."
    ))
    s.append(figure(img("05-dokter-kategori-anc.png"), "Gambar 1. Pemeriksaan Dokter: kategori ANC dipilih dan berhasil disimpan.", max_height=6 * cm))

    s.append(item(2, "Dashboard terbuka di \"Bulan Ini\""))
    s.append(item(3, "Angka pendapatan sama di semua halaman"))
    s.append(body(
        "Sebelumnya ada tiga cara hitung yang berbeda. Sekarang \"Pendapatan Kasir\" di Dashboard, \"Akumulasi Billing Kasir\" di Laporan, "
        "dan lembar \"Penerimaan Kasir\" di Excel memakai hitungan yang sama, yaitu uang yang diterima di kasir menurut tanggal diterima."
    ))
    s.append(figure(img("18-dashboard.png"), "Gambar 2. Dashboard langsung terbuka di \"Bulan Ini\" (Oktober 2026)."))
    s.append(figure(img("14-laporan-ringkasan.png"), "Gambar 3. Laporan dengan rentang 1 sampai 31 Oktober 2026."))
    s.append(table(
        ["Angka (Oktober 2026)", "Dashboard", "Laporan", "Buku Kas", "Hitung langsung database"],
        [
            ["Total kunjungan", "160", "160", "-", "160"],
            ["Pendapatan Kasir", "Rp 15.745.320", "Rp 15.745.320", "-", "Rp 15.745.320"],
            ["Total pengeluaran", "Rp 4.654.000", "Rp 4.654.000", "Rp 4.654.000", "Rp 4.654.000"],
            ["Saldo kas bersih", "Rp 11.091.320", "Rp 11.091.320", "-", "Rp 11.091.320"],
            ["Sisa fisik laci", "Rp 776.320", "-", "Rp 776.320", "Rp 776.320"],
        ],
        [4.2 * cm, 3.2 * cm, 3.2 * cm, 3.0 * cm, 4.2 * cm],
    ))
    s.append(Paragraph("Tabel 2. Angka yang sama di tiap halaman. Tanda \"-\" berarti angka tersebut tidak ditampilkan di halaman itu.", S["caption"]))
    s.append(body(
        "Catatan: \"Tunai Masuk Laci\" di Buku Kas (Rp 11.785.320) lebih kecil dari Pendapatan Kasir karena hanya menghitung uang tunai. "
        "Pembayaran transfer langsung masuk rekening, tidak masuk laci."
    ))

    s.append(item(4, "Grafik tren mengikuti periode"))
    s.append(body("Grafik harian kini menampilkan seluruh tanggal pada bulan yang dipilih, sehingga total di grafik sama dengan kartu Total Kunjungan (160)."))
    s.append(figure(img("19-dashboard-tren-harian.png"), "Gambar 4. Tren Kunjungan Pasien, tampilan Harian Oktober.", width=10 * cm, max_height=10 * cm))

    s.append(item(5, "Tunggakan dari hari sebelumnya tampil di kasir"))
    s.append(body(
        "Pasien yang belum membayar pada hari periksanya tetap tampil di antrean kasir hari berikutnya, dengan tanda kuning "
        "\"Tunggakan\" dan tanggal periksanya, sampai pembayarannya diselesaikan."
    ))
    s.append(figure(img("06-kasir-antrean.png"), "Gambar 5. Antrean kasir: pasien dari 29, 27, dan 10 Oktober tampil dengan tanda Tunggakan.", max_height=10 * cm))

    s.append(item(6, "Buku Kas dicocokkan dengan sheet DATA"))
    s.append(body(
        "Data di aplikasi dicocokkan dengan sheet DATA Google Sheets untuk periode 1 Agustus 2023 sampai 9 Oktober 2026, memakai salinan data "
        "sistem utama dari cadangan 29 Oktober 2026. Pencocokan hanya membaca data, tidak mengubah apa pun."
    ))
    s.append(table(
        ["Yang dicocokkan", "Per bulan", "Per tanggal"],
        [
            ["Jumlah kunjungan, pendapatan kasir, pengeluaran klinik, pengeluaran non klinik, setoran", "39 dari 39 bulan sama", "1.117 dari 1.117 tanggal sama"],
        ],
        [10.4 * cm, 3.7 * cm, 3.7 * cm],
    ))
    s.append(Paragraph("Tabel 3. Hasil pencocokan aplikasi dengan sheet DATA.", S["caption"]))
    s += bullets([
        "Tidak ikut dicocokkan karena sheet DATA tidak memiliki kolomnya: pengeluaran Honor &amp; Transport dan pemasukan Kapitasi BPJS.",
        "Ada 6 isian di sheet yang terbaca Rp 0 dan mohon dicek: tarif berisi \"-\" (4 baris), tarif berisi \"free\" (1 baris), "
        "dan pendapatan lain berisi \"beli obat\" (1 baris). Di aplikasi nilainya juga Rp 0.",
    ])

    s.append(item(7, "Angka cadangan yang tidak nyata dihapus"))
    s.append(body(
        "Sebelumnya, bila jumlah pasien gagal dimuat, Dashboard menampilkan angka tetap 4.238 yang bukan data sebenarnya. "
        "Angka itu sudah dihapus. Bila data gagal dimuat, layar kini menyatakan gagal, termasuk pada kotak \"Perhatian Klinis\"."
    ))
    s.append(item(8, "Tanggal \"hari ini\" memakai WIB"))
    s.append(body(
        "Program Khusus sebelumnya memakai jam internasional, sehingga sebelum pukul 07.00 WIB tanggal \"hari ini\" mundur satu hari. "
        "Sekarang memakai tanggal WIB. Hal yang sama diperbaiki pada nama file Excel yang diunduh."
    ))
    s.append(body(
        "<b>Perbaikan tambahan dari pengujian:</b> tanggal Kas Masuk dan Kas Keluar tidak dapat diisi melebihi hari ini; label angka "
        "di layar HP tidak lagi terpotong; tombol nominal cepat di kasir kini cukup besar untuk disentuh; tampilan usia \"null thn\" diperbaiki."
    ))

    s += h2("4. Rincian Pembaruan Fitur")

    s.append(item(9, "Rekap Pengeluaran Klinik dan Non Klinik"))
    s.append(body(
        "Setiap total pengeluaran kini dipecah menjadi Klinik dan Non Klinik, seperti tabel \"PENGELUARAN TOTAL\" di sheet ANALISA. "
        "Rekap bulanan tersedia di halaman Laporan dan sebagai lembar \"Rekap Pengeluaran\" di file Excel lengkap. Formulir Kas Keluar "
        "mengelompokkan kategori di bawah judul Klinik dan Non Klinik. Sesuai konfirmasi dokter, <b>Honor &amp; Transport dihitung sebagai "
        "pengeluaran Klinik</b>. Setoran ke pemilik atau bank tidak dihitung sebagai pengeluaran."
    ))
    s.append(figure(img("15-laporan-rekap-pengeluaran.png"), "Gambar 6. Rekap Pengeluaran Bulanan di Laporan: Klinik Rp 3.424.000 + Non Klinik Rp 1.230.000 = Rp 4.654.000."))

    s.append(item(10, "Pencatatan tanggal bayar dan pelunasan piutang"))
    s.append(body(
        "Uang kini dicatat pada <b>tanggal uang diterima</b>, bukan tanggal periksa. Dengan begitu, uang yang masuk laci hari ini tercatat di "
        "laci hari ini. Jumlah kunjungan, diagnosa, dan register program tetap dihitung menurut tanggal periksa."
    ))
    s.append(Paragraph("Contoh yang diuji dengan pasien fiktif, masing-masing bertagihan Rp 200.000:", S["body"]))
    s += bullets([
        "Pasien membayar sebagian Rp 80.000 dengan status Piutang. Sisa piutang Rp 120.000 tercatat (Gambar 7).",
        "Saat pasien kembali, kasir melihat \"Sudah dibayar\" beserta tanggalnya, \"Sisa piutang\", dan \"Harus dibayar sekarang\" (Gambar 8).",
        "Kuitansi pelunasan mencantumkan Tanggal Periksa, Tanggal Bayar, dan Tanggal Pelunasan (Gambar 9).",
        "Di Laporan, pilihan \"Hanya pembayaran beda hari\" menampilkan kunjungan yang uangnya diterima di hari lain (Gambar 10).",
    ])
    s.append(figure(img("09-kasir-tunggakan-piutang.png"), "Gambar 7. Kasir: pembayaran sebagian Rp 80.000, sisa piutang Rp 120.000.", max_height=10.5 * cm))
    s.append(figure(img("10-kasir-sisa-piutang.png"), "Gambar 8. Kasir: pasien kembali untuk melunasi sisa piutang.", max_height=10.5 * cm))
    s.append(figure(img("11-kuitansi-pelunasan.png"), "Gambar 9. Kuitansi pelunasan Tn. PASIEN UJI SISTEM: diperiksa dan membayar sebagian 28 Oktober, lunas 30 Oktober.", max_height=10 * cm))
    s.append(figure(img("16-laporan-beda-hari.png"), "Gambar 10. Laporan: kolom Tgl Periksa dan Tgl Bayar untuk pembayaran beda hari.", max_height=10 * cm))
    s.append(boxed(
        "<b>Batasan saat ini:</b> setelah pembayaran pertama, pembayaran berikutnya harus melunasi seluruh sisa tagihan. "
        "Cicilan lebih dari dua kali untuk satu kunjungan belum didukung. Bila klinik membutuhkannya, hal ini dapat menjadi pengembangan lanjutan.",
        kind="warn",
    ))

    s.append(item(11, "Program Khusus menampilkan pasien aktif"))
    s.append(body(
        "Kartu Kendali TBC, Sirkumsisi, dan Agenda Observasi kini terbuka pada tampilan \"Pasien Aktif\". Yang dihitung aktif: pasien TBC "
        "berstatus Dalam Pengobatan atau Mangkir; sirkumsisi dalam 14 hari terakhir (mencakup kontrol H+7); agenda observasi berstatus Menunggu "
        "atau Mangkir. Tombol \"Semua Riwayat\" tetap menampilkan seluruh data. Program Kesehatan tidak berubah dan tidak ada data yang dihapus. "
        "Batas hari ke-14 (masih aktif) dan hari ke-15 (tidak aktif) sudah diuji."
    ))
    s.append(figure(img("17-program-khusus-aktif.png"), "Gambar 11. Program Khusus: tab Sirkumsisi pada tampilan Pasien Aktif."))

    s.append(item(12, "Saldo Awal laci kasir"))
    s.append(body(
        "Sebelumnya sisa laci selalu dihitung dari nol setiap bulan, sehingga uang sisa bulan lalu yang disetor bulan ini membuat sisa laci "
        "minus. Sekarang pemilik dapat mengisi <b>Saldo Awal</b>, yaitu uang tunai hasil hitung di laci pada awal bulan. Bulan berikutnya "
        "otomatis melanjutkan sisa laci bulan sebelumnya. Hanya akun Pemilik yang dapat melihat dan mengisinya. Saldo Awal tidak mengubah "
        "laba bersih."
    ))
    s.append(table(
        ["Komponen (Oktober 2026, data uji)", "Nominal"],
        [
            ["Saldo Awal (diisi pemilik)", "Rp 4.000.000"],
            ["+ Tunai masuk laci", "Rp 11.785.320"],
            ["- Pengeluaran tunai dari laci", "Rp 4.654.000"],
            ["- Setoran ke pemilik atau bank", "Rp 10.355.000"],
            ["= Sisa fisik di laci", "Rp 776.320"],
        ],
        [12.3 * cm, 5.5 * cm],
    ))
    s.append(Paragraph("Tabel 4. Perhitungan sisa laci. Tanpa Saldo Awal, hasilnya minus Rp 3.223.680.", S["caption"]))
    s.append(figure(img("13-saldo-awal-modal.png"), "Gambar 12. Formulir Ubah Saldo Awal Laci di Buku Kas (khusus Pemilik).", max_height=10 * cm))
    s.append(figure(img("12-buku-kas-rekonsiliasi.png"), "Gambar 13. Rekonsiliasi Fisik Laci Kasir dengan baris Saldo Awal."))

    s += h2("5. Hal yang Memerlukan Keputusan Dokter")
    s.append(Paragraph("A. Arti \"Total Pendapatan\" (garis ungu di sheet DASHBOARD)", S["h3"]))
    s.append(boxed("Masukan dokter: <i>\"Om nnti pendapatan totalnya yang warna ungu ya\"</i>"))
    s.append(Spacer(1, 3))
    s.append(body(
        "Kami sudah memeriksa sheet: TOTAL PENDAPATAN (garis ungu) adalah tarif ditambah pendapatan lain dari <b>seluruh</b> kunjungan, "
        "termasuk pasien BPJS. Rumus ini sama dengan isi sheet pada 38 bulan, Agustus 2023 sampai September 2026. Sementara itu, "
        "\"Pendapatan Kasir\" di aplikasi adalah uang yang benar-benar dibayar pasien di kasir, sehingga tarif pasien BPJS dihitung Rp 0 "
        "karena dibayar lewat kapitasi."
    ))
    s.append(body(
        "Usulan kami: menambahkan angka <b>\"Total Pendapatan\"</b> dengan rumus yang sama seperti garis ungu di sheet, dan tetap "
        "mempertahankan \"Pendapatan Kasir\" untuk mencocokkan uang di laci. Mohon konfirmasi dokter sebelum kami kerjakan."
    ))
    s.append(Paragraph("B. Cicilan lebih dari dua kali", S["h3"]))
    s.append(body("Mohon informasi apakah klinik sering menerima cicilan lebih dari dua kali untuk satu kunjungan (lihat batasan pada nomor 10)."))
    s.append(Paragraph("C. Saldo Awal laci", S["h3"]))
    s.append(body(
        "Setelah diterapkan ke sistem utama, mohon pemilik menghitung uang di laci pada awal bulan berjalan dan mengisinya di menu Buku Kas. "
        "Angka Rp 4.000.000 pada laporan ini hanya data uji."
    ))

    s += h2("6. Langkah Selanjutnya")
    s += bullets([
        "Dokter memeriksa laporan ini dan memberi persetujuan atau masukan.",
        "Sebelum penerapan, kami memeriksa data sistem utama (hanya membaca) untuk memastikan tidak ada transaksi lama yang perlu disesuaikan.",
        "Penerapan ke sistem utama: penambahan kolom dan tabel database yang dibutuhkan, lalu pembaruan aplikasi. Data yang sudah ada tidak dihapus.",
        "Pemilik mengisi Saldo Awal laci untuk bulan berjalan.",
        "Keputusan pada bagian 5A kami kerjakan setelah dikonfirmasi.",
    ], marker="•")

    s.append(Spacer(1, 10))
    s.append(info_grid([[
        "Mengetahui dan menyetujui,<br/><b>Pimpinan Klinik</b><br/><br/><br/><br/><b><u>dr. Ade Sofyan</u></b>",
        "Dilaporkan oleh,<br/><b>Pengembang SIM Klinik</b><br/><br/><br/><br/><b><u>Tim Pengembang</u></b>",
    ]]))
    return s


if __name__ == "__main__":
    build(story(), OUT_PATH, TITLE, RUNNING, copies=[DOWNLOADS])
