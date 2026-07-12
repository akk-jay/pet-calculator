#!/usr/bin/env python
"""
宠物计算器 - 论文拉取工具
自动从 PubMed Central / Unpaywall 下载论文 PDF 并转为可读文本
"""

import requests
import json
import os
import time
import sys
import fitz  # PyMuPDF

# Fix Unicode output on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# --- 所有需要拉取的论文 ---
PAPERS = [
    # 年龄换算
    {"id": "wang2020", "doi": "10.1016/j.cels.2020.06.006", "pmid": "32619550", "label": "Wang-2020-犬人老化-CellSystems"},
    {"id": "promislow2020", "doi": "10.1016/j.cels.2020.07.007", "pmid": "32681033", "label": "Promislow-2020-评论-CellSystems"},
    {"id": "kraus2013", "doi": "10.1086/669665", "pmid": "23535614", "label": "Kraus-2013-犬体型寿命-AmNat"},
    {"id": "dasilva2023", "doi": "10.1086/724384", "pmid": "", "label": "daSilva-2023-犬寿命进化-AmNat"},
    {"id": "salt2019", "doi": "10.1111/jvim.15367", "pmid": "30548336", "label": "Salt-2019-超重犬寿命-JVetInternMed"},

    # 喂食/营养
    {"id": "kleiber1947", "doi": "10.1152/physrev.1947.27.4.511", "pmid": "", "label": "Kleiber-1947-代谢率定律-PhysiolRev"},
    {"id": "aaha2021", "doi": "10.5326/JAAHA-MS-7232", "pmid": "34228790", "label": "AAHA-2021-犬猫营养指南-JAAHA"},
    {"id": "brooks2014", "doi": "10.5326/JAAHA-MS-6331", "pmid": "", "label": "Brooks-2014-AAHA体重管理-JAAHA"},
    {"id": "freeman2013", "doi": "10.2460/javma.243.11.1549", "pmid": "24261804", "label": "Freeman-2013-生食风险-JAVMA"},
    {"id": "lyu2025", "doi": "", "pmid": "", "label": "Lyu-2025-生食综述-AnimalsMDPI", "note": "待查DOI"},

    # 孕期
    {"id": "beccaglia2016", "doi": "10.1111/rda.12782", "pmid": "27670935", "label": "Beccaglia-2016-犬猫孕期综述-ReprodDomestAnim"},
    {"id": "concannon1983", "doi": "", "pmid": "6685438", "label": "Concannon-1983-犬孕期-AmJVetRes"},
    {"id": "sparkes2006", "doi": "10.1016/j.jfms.2005.11.003", "pmid": "", "label": "Sparkes-2006-猫孕期-JFelineMedSurg"},
    {"id": "romagnoli2019", "doi": "10.1177/1098612X18824181", "pmid": "", "label": "Romagnoli-2019-猫繁殖-JFelineMedSurg"},
    {"id": "lamm2012", "doi": "10.1016/j.cvsm.2012.01.010", "pmid": "", "label": "Lamm-2012-犬猫妊娠-VetClinNAm"},
    {"id": "siena2021", "doi": "10.3390/ani11030878", "pmid": "", "label": "Siena-2021-犬分娩预测-AnimalsMDPI"},

    # 疫苗
    {"id": "squires2024", "doi": "10.1111/jsap.13718", "pmid": "38568777", "label": "Squires-2024-WSAVA疫苗指南-JSmallAnimPract"},
    {"id": "aafp2020", "doi": "10.1177/1098612X19895940", "pmid": "31916872", "label": "AAFP-2020-猫逆转录病毒-JFelineMedSurg"},
    {"id": "day2016", "doi": "10.1111/jsap.2_12431", "pmid": "", "label": "Day-2016-WSAVA疫苗旧版-JSmallAnimPract"},

    # 驱虫
    {"id": "esccap2022", "doi": "", "pmid": "", "label": "ESCCAP-2022-体外寄生虫指南", "note": "官方网站PDF"},
]

OUTPUT_DIR = "papers"
TEXT_DIR = os.path.join(OUTPUT_DIR, "text")
PDF_DIR = os.path.join(OUTPUT_DIR, "pdf")

os.makedirs(TEXT_DIR, exist_ok=True)
os.makedirs(PDF_DIR, exist_ok=True)

HEADERS = {
    "User-Agent": "PetToolKit/1.0 (academic research; mailto:petoolkit@outlook.com)"
}

def check_pmc(pmcid):
    """尝试从 PubMed Central 下载 OA 全文"""
    if not pmcid:
        return None
    url = f"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC{pmcid}/pdf/"
    try:
        r = requests.head(url, headers=HEADERS, timeout=10)
        if r.status_code == 200:
            return url
    except:
        pass
    return None

def check_unpaywall(doi):
    """通过 Unpaywall API 查找免费全文"""
    if not doi:
        return None
    url = f"https://api.unpaywall.org/v2/{doi}?email=petoolkit@outlook.com"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code == 200:
            data = r.json()
            best = data.get("best_oa_location") or {}
            pdf_url = best.get("url_for_pdf") or best.get("url")
            if pdf_url:
                return pdf_url
    except:
        pass
    return None

def try_open_access(doi):
    """尝试直接通过 DOI 获取 OA 版本"""
    if not doi:
        return None
    # 尝试多个 OA 源
    urls = [
        f"https://doi.org/{doi}",
    ]
    # 直接尝试常见 OA 模式
    if "10.3390/" in doi:
        # MDPI journals are all OA
        return f"https://doi.org/{doi}"
    if "10.1111/jsap." in doi:
        # JSAP/Wiley sometimes has free access
        pass
    return None

def download_pdf(url, label):
    """Download PDF, return path or None"""
    pdf_path = os.path.join(PDF_DIR, f"{label}.pdf")
    try:
        r = requests.get(url, headers=HEADERS, timeout=60, stream=True, allow_redirects=True)
        ct = r.headers.get("content-type", "").lower()
        # Accept PDF, octet-stream, or anything that looks like a download
        is_ok = r.status_code == 200 and (
            "pdf" in ct or "octet-stream" in ct or "download" in ct
            or len(r.content) > 5000  # if >5KB, probably a valid file
        )
        if is_ok:
            with open(pdf_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
            file_size = os.path.getsize(pdf_path)
            if file_size > 1000:
                return pdf_path
            else:
                os.remove(pdf_path)
                return None
    except:
        pass
    return None

def pdf_to_text(pdf_path, label):
    """PDF 转文本"""
    text_path = os.path.join(TEXT_DIR, f"{label}.txt")
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        if len(text.strip()) > 200:  # 至少 200 字符才算有效
            with open(text_path, "w", encoding="utf-8") as f:
                f.write(text)
            return text_path, len(text)
    except Exception as e:
        pass
    return None, 0

def main():
    results = {"success": [], "failed": [], "manual": []}

    for i, paper in enumerate(PAPERS, 1):
        pid = paper["id"]
        label = paper["label"]
        doi = paper.get("doi", "")
        pmid = paper.get("pmid", "")
        note = paper.get("note", "")

        print(f"\n[{i}/{len(PAPERS)}] {label}")
        if note:
            print(f"  [WARN]️ {note}")

        pdf_path = None

        # 策略 1: Unpaywall (最可能成功)
        if doi:
            print(f"  -> Unpaywall...")
            url = check_unpaywall(doi)
            if url:
                print(f"    找到: {url[:100]}...")
                pdf_path = download_pdf(url, label)
                if pdf_path:
                    print(f"    [OK] 下载成功")

        # 策略 2: PubMed Central
        if not pdf_path and pmid:
            print(f"  -> PubMed Central...")
            # 先查 PMC ID（通过 E-utilities）
            pmc_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/elink.fcgi?dbfrom=pubmed&db=pmc&id={pmid}&retmode=json"
            try:
                r = requests.get(pmc_url, headers=HEADERS, timeout=10)
                if r.status_code == 200:
                    data = r.json()
                    links = data.get("linksets", [{}])[0].get("linksetdbs", [])
                    for link in links:
                        if link.get("linkname") == "pubmed_pmc":
                            pmcids = link.get("links", [])
                            if pmcids:
                                pdf_url = f"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC{pmcids[0]}/pdf/"
                                pdf_path = download_pdf(pdf_url, label)
                                if pdf_path:
                                    print(f"    [OK] PMC 下载成功")
                                    break
            except:
                pass

        # 策略 3: 直接 DOI
        if not pdf_path and doi:
            print(f"  -> 直接 DOI...")
            # 某些期刊允许直接访问
            direct_urls = []
            if "10.3390/" in doi:
                # MDPI journals are all OA
                parts = doi.split("/")
                if len(parts) >= 3:
                    direct_urls.append(f"https://www.mdpi.com/{parts[1]}/{parts[2]}/{parts[-1]}/pdf")
            for url in direct_urls:
                pdf_path = download_pdf(url, label)
                if pdf_path:
                    print(f"    [OK] 直接下载成功")
                    break

        # 转文本
        if pdf_path:
            text_path, char_count = pdf_to_text(pdf_path, label)
            if text_path:
                print(f"    [TXT] {char_count:,} chars -> {text_path}")
                results["success"].append({"paper": paper, "text_path": text_path, "chars": char_count})
            else:
                print(f"    [WARN]️ PDF 转文本失败")
                results["failed"].append(paper)
        else:
            print(f"    [FAIL] 所有策略均失败")
            results["manual"].append(paper)

        time.sleep(1)  # 礼貌间隔

    # --- 报告 ---
    print("\n" + "=" * 60)
    print(f"[OK] 成功: {len(results['success'])} 篇")
    print(f"[FAIL] 失败: {len(results['failed'])} 篇")
    print(f"[LIST] 需手动下载: {len(results['manual'])} 篇")
    print("=" * 60)

    if results["manual"]:
        print("\n需手动下载的论文 (DOI 链接):")
        for p in results["manual"]:
            d = p.get("doi", "")
            pmid = p.get("pmid", "")
            label = p["label"]
            if d:
                print(f"  {label}")
                print(f"    https://doi.org/{d}")
            elif pmid:
                print(f"  {label}")
                print(f"    https://pubmed.ncbi.nlm.nih.gov/{pmid}/")
            else:
                print(f"  {label} — 无 DOI/PMID，请手动搜索")

    # 保存成功列表
    report_path = os.path.join(OUTPUT_DIR, "download_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump({
            "success": [{"id": r["paper"]["id"], "label": r["paper"]["label"], "chars": r["chars"]} for r in results["success"]],
            "manual": [{"id": p["id"], "label": p["label"], "doi": p.get("doi",""), "pmid": p.get("pmid","")} for p in results["manual"]],
        }, f, ensure_ascii=False, indent=2)
    print(f"\n报告已保存: {report_path}")

if __name__ == "__main__":
    main()
