import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Feather,
  Search,
  Stars,
  Download,
  Copy,
  Image as ImageIcon,
  ExternalLink,
  X,
  Maximize2,
  Link as LinkIcon,
  Info,
  Zap,
  Layers,
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/** 后端基础地址（Vercel 项目里配 VITE_API_BASE；本地回退 127.0.0.1:8000） */
const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

/* ------------------------ 复用小组件 ------------------------ */
const Container: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className, children }) => (
  <div className={`mx-auto px-6 ${className || ""}`} style={{ maxWidth: 1200 }}>
    {children}
  </div>
);

const Card: React.FC<
  React.PropsWithChildren<{ className?: string; title?: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode }>
> = ({ className, children, title, subtitle, right }) => (
  <div
    className={
      "rounded-2xl border bg-white shadow-[0_10px_30px_rgba(20,20,20,0.06)] border-[#eee] " +
      "relative overflow-hidden " +
      (className || "")
    }
  >
    <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-rose-200 via-pink-200 to-amber-200"></div>
    {(title || subtitle || right) && (
      <div className="flex items-center justify-between gap-4 px-5 pt-4 pb-3 border-b border-[#f1f1f1] bg-white/70">
        <div>
          {title ? <div className="text-[18px] md:text-[20px] font-semibold text-[#1f2328]">{title}</div> : null}
          {subtitle ? <div className="text-sm text-[#6b7280] mt-0.5">{subtitle}</div> : null}
        </div>
        {right ? <div className="flex items-center gap-2">{right}</div> : null}
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
);

const Label: React.FC<React.PropsWithChildren> = ({ children }) => (
  <label className="text-[13px] text-[#667085] block mb-1">{children}</label>
);

const Input: React.FC<{
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}> = ({ value, onChange, type = "text", placeholder }) => (
  <input
    value={value as any}
    onChange={(e) => onChange(e.currentTarget.value)}
    type={type}
    placeholder={placeholder}
    className="w-full rounded-xl border border-[#e6e7eb] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-pink-200 bg-white text-[#1f2328] placeholder:text-[#9aa0a6] text-[14px]"
  />
);

const Button: React.FC<
  React.PropsWithChildren<{ onClick?: () => void; variant?: "primary" | "ghost" | "soft"; disabled?: boolean }>
> = ({ onClick, children, variant = "primary", disabled }) => {
  const cls =
    variant === "primary"
      ? "bg-gradient-to-r from-[#ffd7e2] via-[#fbd1dd] to-[#ffd9c2] text-[#1f2328] border border-[#f1c9d2]"
      : variant === "soft"
      ? "bg-[#fff5f7] text-[#7a4a55] border border-[#ffd7e2] hover:bg-[#fff1f4]"
      : "bg-white text-[#1f2328] border border-[#e6e7eb] hover:bg-[#fafafa]";
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.01 }}
      whileTap={{ scale: disabled ? 1 : 0.99 }}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-medium transition ${cls} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      {children}
    </motion.button>
  );
};

const SkeletonRow: React.FC = () => <div className="animate-pulse h-12 w-full bg-[#f5f6f8] rounded-lg mb-2" />;

/* ------------------------ 图片 Modal ------------------------ */
const ImageModal: React.FC<{ src: string; open: boolean; onClose: () => void; title?: string }> = ({
  src,
  open,
  onClose,
  title,
}) => {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative max-w-5xl w-full"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-2xl bg-white border border-[#eaeaea] shadow-[0_12px_40px_rgba(0,0,0,0.16)] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#efefef] bg-white/80">
                <div className="flex items-center gap-2 text-[#1f2328]">
                  <Maximize2 size={18} />
                  <span className="text-sm">{title || "Preview"}</span>
                </div>
                <button onClick={onClose} className="text-[#6b7280] hover:text-[#1f2328]" aria-label="Close">
                  <X size={22} />
                </button>
              </div>
              <div className="p-2">{src ? <img src={src} className="w-full" /> : <div className="h-96 grid place-items-center text-[#6b7280]"><ImageIcon className="opacity-60" /></div>}</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ------------------------ 状态 ------------------------ */
type TabKey = "steel" | "program" | "batch";

export default function App() {
  const [tab, setTab] = useState<TabKey>("steel");

  /** スチール写真 链接推测 */
  const [prefix, setPrefix] = useState("2511161"); // 默认 Goethe Forum
  const [ssMin, setSsMin] = useState("1");
  const [ssMax, setSsMax] = useState("40");
  const [steelRows, setSteelRows] = useState<any[]>([]);
  const [steelLoading, setSteelLoading] = useState(false);
  const [steelProgress, setSteelProgress] = useState(0);
  const progressTimer = useRef<number | null>(null);

  /** 公演プログラム / 场刊检索 */
  const [year, setYear] = useState("2025");
  const [q, setQ] = useState("花組 Goethe");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [prgRows, setPrgRows] = useState<any[]>([]);
  const [prgLoading, setPrgLoading] = useState(false);

  /** 公演名一括 / 批量检索 */
  const [batchYear, setBatchYear] = useState("2025");
  const [batchTitle, setBatchTitle] = useState("Goethe 花組");
  const [batchRows, setBatchRows] = useState<any[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [gForum, setGForum] = useState<any[]>([]);
  const [gUmeda, setGUmeda] = useState<any[]>([]);

  /** 图片 Modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSrc, setModalSrc] = useState("");
  const [modalTitle, setModalTitle] = useState("");

  /* Program 分页 */
  const totalPages = useMemo(() => Math.max(1, Math.ceil(prgRows.length / pageSize)), [prgRows.length, pageSize]);
  const prgPageRows = useMemo(() => prgRows.slice((page - 1) * pageSize, page * pageSize), [prgRows, page, pageSize]);

  /* ------------------- 工具函数 ------------------- */
  const toCSV = (rows: any[], headers?: string[]) => {
    if (!rows?.length) return "";
    const cols = headers || Object.keys(rows[0]);
    const esc = (s: any) => '"' + String(s ?? "").replace(/"/g, '""') + '"';
    return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  };
  const downloadCSV = (filename: string, rows: any[], headers?: string[]) => {
    if (!rows?.length) {
      toast.info("没有可导出的数据 / データなし", { position: "bottom-right" });
      return;
    }
    const csv = toCSV(rows, headers);
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };
  const copyLinks = (rows: any[]) => {
    const txt = rows.filter((r) => r?.url).map((r) => r.url).join("\n");
    if (!txt) {
      toast.info("没有可复制的链接 / リンクなし", { position: "bottom-right" });
      return;
    }
    navigator.clipboard.writeText(txt);
    toast.info("已复制 / コピーしました！", { position: "bottom-right" });
  };
  const copySingle = (url?: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.info("已复制 / コピーしました！", { position: "bottom-right" });
  };
  const readImageLink = (row: any) => {
    const link = row?.image_url || row?.image || row?.img || row?.thumb || row?.imageLink;
    if (link) {
      navigator.clipboard.writeText(link);
      toast.success("已读取图片直链（已复制）/ 画像リンクを読み取りました（コピー済）", { position: "bottom-right" });
    } else {
      toast.warn("未找到该行图片 / この行には画像がありません", { position: "bottom-right" });
    }
  };
  const openImage = (src?: string, title?: string) => {
    if (!src) return;
    setModalSrc(src);
    setModalTitle(title || "");
    setModalOpen(true);
  };

  /* ------------------- API 调用 ------------------- */
  const runSteel = async () => {
    try {
      setSteelLoading(true);
      setSteelProgress(0);
      setSteelRows([]);

      let p = 0;
      progressTimer.current = window.setInterval(() => {
        p = Math.min(90, p + Math.random() * 12);
        setSteelProgress(p);
      }, 180);

      const params = new URLSearchParams({ prefix, ss_min: ssMin, ss_max: ssMax });
      const res = await fetch(`${API_BASE}/api/bro?${params.toString()}`);
      if (!res.ok) throw new Error("BRO API failed");
      const data = await res.json();
      setSteelRows(data?.results || []);

      setSteelProgress(100);
      setTimeout(() => setSteelProgress(0), 500);
      toast.success(`命中 ${data?.results?.filter((r: any) => r.url).length} 件`, { position: "bottom-right" });
    } catch {
      setSteelProgress(0);
      toast.error("取得に失敗しました / 获取失败", { position: "bottom-right" });
    } finally {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
      setSteelLoading(false);
    }
  };

  const runProgram = async () => {
    try {
      setPrgLoading(true);
      setPage(1);
      const params = new URLSearchParams({ year });
      (q || "")
        .split(/\s+/)
        .filter(Boolean)
        .forEach((t) => params.append("q", t));
      const res = await fetch(`${API_BASE}/api/program?${params.toString()}`);
      if (!res.ok) throw new Error("Program API failed");
      const data = await res.json();
      setPrgRows(data?.results || []);
      toast.success(`命中 ${data?.results?.length} 件`, { position: "bottom-right" });
    } catch {
      toast.error("取得に失敗しました / 获取失败", { position: "bottom-right" });
    } finally {
      setPrgLoading(false);
    }
  };

  const runBatch = async () => {
    try {
      setBatchLoading(true);
      const params = new URLSearchParams({ year: batchYear });
      (batchTitle || "")
        .split(/\s+/)
        .filter(Boolean)
        .forEach((t) => params.append("q", t));
      const res = await fetch(`${API_BASE}/api/program?${params.toString()}`);
      if (!res.ok) throw new Error("Batch Program API failed");
      const data = await res.json();
      setBatchRows(data?.results || []);
      toast.success(`批量命中 ${data?.results?.length} 件`, { position: "bottom-right" });
    } catch {
      toast.error("批量取得に失敗しました / 批量获取失败", { position: "bottom-right" });
    } finally {
      setBatchLoading(false);
    }
  };

  const loadGoethePreset = async () => {
    try {
      setBatchLoading(true);
      const res = await fetch(`${API_BASE}/api/goethe`);
      if (!res.ok) throw new Error("Goethe API failed");
      const data = await res.json();
      setGForum(data?.forum || []);
      setGUmeda(data?.umeda || []);
      setBatchRows(data?.program || []);
      toast.success("Goethe 预设已加载", { position: "bottom-right" });
    } catch {
      toast.error("Goethe 预设加载失败", { position: "bottom-right" });
    } finally {
      setBatchLoading(false);
    }
  };

  /* ------------------- 渲染 ------------------- */
  return (
    <div
      className="
        min-h-screen text-[#1f2328]
        font-[Inter,_Noto_Sans_JP,system-ui,sans-serif]
      "
      style={{
        backgroundImage:
          "linear-gradient(180deg,#fffdfb,rgba(255,245,248,0.7)),radial-gradient(1200px 600px at 20% -10%,rgba(255,214,227,0.35),transparent),radial-gradient(1000px 500px at 110% 10%,rgba(216,231,255,0.35),transparent),repeating-linear-gradient(45deg,rgba(0,0,0,0.015) 0, rgba(0,0,0,0.015) 2px, rgba(0,0,0,0.01) 2px, rgba(0,0,0,0.01) 4px)",
      }}
    >
      <ToastContainer position="bottom-right" autoClose={1800} newestOnTop closeOnClick draggable theme="light" />

      {/* 顶部 */}
      <div className="border-b border-[#efefef] bg-white/80 backdrop-blur-[2px] sticky top-0 z-30">
        <Container className="py-5">
          <div className="flex items-end justify-between gap-4">
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="text-[24px] md:text-[28px] font-semibold tracking-tight"
            >
              Takarazuka Link Finder
            </motion.h1>
          </div>

          {/* Tabs（重命名 + 双语） */}
          <div className="mt-4">
            <div className="flex flex-wrap gap-8">
              {[
                { key: "steel", jp: "スチール写真リンク推測", cn: "スチール写真链接推测", icon: <Search size={16} /> },
                { key: "program", jp: "公演プログラム", cn: "场刊检索", icon: <Feather size={16} /> },
                { key: "batch", jp: "公演名一括", cn: "批量检索", icon: <Stars size={16} /> },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key as TabKey)}
                  className={`group inline-flex items-center gap-2 pb-3 -mb-px text-[15px] ${
                    tab === t.key
                      ? "text-[#b2566e] border-b-2 border-[#b2566e]"
                      : "text-[#6b7280] hover:text-[#1f2328] border-b-2 border-transparent"
                  }`}
                >
                  {t.icon}
                  <span className="font-medium">{t.jp}</span>
                  <span className="text-[#9aa0a6]">/ {t.cn}</span>
                </button>
              ))}
            </div>
          </div>
        </Container>
      </div>

      {/* 内容 */}
      <Container className="py-8">
        {/* 1) スチール写真リンク推測 */}
        {tab === "steel" && (
          <div className="grid lg:grid-cols-3 gap-8">
            <Card
              title="参数 / パラメータ"
              subtitle={
                <div className="flex items-center gap-2 text-[#7a7f87]">
                  <Info size={16} />
                  <span className="text-[12px]">
                    规则：「YYMMDDB + SS」 → 其中 <b>B=组别</b>（花1/月2/雪3/星4/宙5）。例如 Goethe Forum 前缀 2511161。
                  </span>
                </div>
              }
              className="lg:col-span-1"
            >
              <div className="space-y-4 text-[14px]">
                <div>
                  <Label>前缀（YYMMDDB）/ プレフィックス</Label>
                  <Input value={prefix} onChange={setPrefix} placeholder="2511161" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>SS 最小 / 最小</Label>
                    <Input value={ssMin} onChange={setSsMin} type="number" />
                  </div>
                  <div>
                    <Label>SS 最大 / 最大</Label>
                    <Input value={ssMax} onChange={setSsMax} type="number" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={runSteel} disabled={steelLoading}>
                    {steelLoading ? (
                      <>
                        <Feather className="animate-spin text-[#d67b96]" size={16} /> 実行中 / 执行中
                      </>
                    ) : (
                      <>
                        <Zap size={16} />
                        検索開始 / 开始检索
                      </>
                    )}
                  </Button>
                </div>
                {/* 进度条 */}
                <div className="h-2 rounded-full bg-[#f1f3f4] overflow-hidden mt-2">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#ffd7e2] via-[#fbd1dd] to-[#ffd9c2]"
                    initial={{ width: 0 }}
                    animate={{ width: `${steelProgress}%` }}
                    transition={{ ease: "easeOut", duration: 0.2 }}
                  />
                </div>

                {/* 使用说明 */}
                <div className="mt-4 text-[12.5px] text-[#6b7280] leading-relaxed bg-[#fff7f9] border border-[#ffe0ea] rounded-xl p-3">
                  <div className="flex items-center gap-2 font-medium text-[#b2566e] mb-1">
                    <Layers size={14} /> 使用说明 / 使い方
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>输入公演对应的前缀（YYMMDDB），例如 <b>2511161</b>（2025/11/16/花组）。</li>
                    <li>设定 SS 范围（通常 1–40）。点击开始后，将逐一尝试并返回可用链接与缩略图。</li>
                    <li>点击缩略图可弹窗放大；点击「读取/読む」可直接复制图片直链。</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card
              title="结果 / 結果"
              right={
                <>
                  <Button variant="ghost" onClick={() => downloadCSV("steel_results.csv", steelRows)}>
                    <Download size={16} />
                    CSV
                  </Button>
                  <Button variant="ghost" onClick={() => copyLinks(steelRows)}>
                    <Copy size={16} />
                    复制链接
                  </Button>
                </>
              }
              className="lg:col-span-2"
            >
              {steelLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[14px]">
                    <thead>
                      <tr className="text-[#6b7280]">
                        <th className="py-2 pr-4">SS</th>
                        <th className="py-2 pr-4">尾码 / Tail</th>
                        <th className="py-2 pr-4">状态 / Status</th>
                        <th className="py-2 pr-4">标题 / タイトル</th>
                        <th className="py-2 pr-4">链接 / リンク</th>
                        <th className="py-2 pr-4">图片 / 画像</th>
                        <th className="py-2">读取 / 読み取り</th>
                      </tr>
                    </thead>
                    <tbody>
                      {steelRows.map((r, i) => (
                        <tr key={i} className="border-t border-[#efefef] hover:bg-[#fafafa]">
                          <td className="py-3 pr-4">{r.ss}</td>
                          <td className="py-3 pr-4">{r.tail ?? ""}</td>
                          <td className="py-3 pr-4">{r.status}</td>
                          <td className="py-3 pr-4">{r.title || ""}</td>
                          <td className="py-3 pr-4">
                            {r.url ? (
                              <div className="flex items-center gap-2">
                                <a className="text-[#b2566e] underline" href={r.url} target="_blank" rel="noreferrer">
                                  打开 / open
                                </a>
                                <button className="text-xs text-[#6b7280] hover:text-[#1f2328]" onClick={() => copySingle(r.url)}>
                                  复制 / copy
                                </button>
                              </div>
                            ) : (
                              ""
                            )}
                          </td>
                          <td className="py-3">
                            {r.image_url ? (
                              <img
                                onClick={() => openImage(r.image_url, r.title)}
                                className="h-16 rounded-xl border border-[#efefef] hover:shadow hover:scale-[1.02] transition cursor-zoom-in"
                                src={r.image_url}
                                alt="thumb"
                              />
                            ) : (
                              ""
                            )}
                          </td>
                          <td className="py-3">
                            <Button variant="soft" onClick={() => readImageLink(r)}>
                              <LinkIcon size={16} />
                              读取 / 読む
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* 2) 公演プログラム / 场刊检索 */}
        {tab === "program" && (
          <div className="grid lg:grid-cols-3 gap-8">
            <Card title="搜索条件 / 検索条件" className="lg:col-span-1">
              <div className="space-y-4 text-[14px]">
                <div>
                  <Label>年度 / Year</Label>
                  <Input value={year} onChange={setYear} type="number" />
                </div>
                <div>
                  <Label>关键词（空格 AND）/ キーワード（スペース区切り AND）</Label>
                  <Input value={q} onChange={setQ} placeholder="花組 Goethe" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>每页 / 件/ページ</Label>
                    <Input value={String(pageSize)} onChange={(v) => setPageSize(Math.max(1, Number(v)))} type="number" />
                  </div>
                </div>
                <Button onClick={runProgram} disabled={prgLoading}>
                  {prgLoading ? (
                    <>
                      <Feather className="animate-spin text-[#d67b96]" size={16} /> 検索中 / 检索中
                    </>
                  ) : (
                    <>開始 / 开始</>
                  )}
                </Button>
              </div>
            </Card>

            <Card
              title="结果 / 結果"
              right={
                <>
                  <Button variant="ghost" onClick={() => downloadCSV("program_results.csv", prgRows)}>
                    <Download size={16} />
                    CSV
                  </Button>
                  <Button variant="ghost" onClick={() => copyLinks(prgRows)}>
                    <Copy size={16} />
                    复制链接
                  </Button>
                </>
              }
              className="lg:col-span-2"
            >
              {prgLoading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[14px]">
                    <thead>
                      <tr className="text-[#6b7280]">
                        <th className="py-2 pr-4">标题 / Title</th>
                        <th className="py-2 pr-4">链接/图片 / Link/Image</th>
                        <th className="py-2">读取 / 読み取り</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prgPageRows.map((r, i) => {
                        const img = r?.image_url || r?.image || r?.img || r?.thumb || r?.imageLink;
                        return (
                          <tr key={i} className="border-t border-[#efefef] hover:bg-[#fafafa]">
                            <td className="py-3 pr-4">
                              <a className="text-[#b2566e] underline inline-flex items-center gap-1" href={r.url} target="_blank" rel="noreferrer">
                                {r.title}
                                <ExternalLink size={14} />
                              </a>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2">
                                {img ? (
                                  <>
                                    <img
                                      onClick={() => openImage(img, r.title)}
                                      className="h-14 rounded-xl border border-[#efefef] hover:shadow hover:scale-[1.02] transition cursor-zoom-in"
                                      src={img}
                                      alt="thumb"
                                    />
                                    <a className="text-sm text-[#b2566e] underline" href={img} download target="_blank" rel="noreferrer">
                                      下载 / download
                                    </a>
                                  </>
                                ) : (
                                  <span className="text-xs text-[#9aa0a6] inline-flex items-center gap-1">
                                    <ImageIcon size={14} />
                                    无图 / no image
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3">
                              <Button variant="soft" onClick={() => readImageLink(r)}>
                                <LinkIcon size={16} />
                                读取 / 読む
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 分页 */}
              <div className="flex items-center justify-center gap-3 mt-4">
                <div className="inline-flex gap-2 items-center">
                  <Button variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    上一页 / 前へ
                  </Button>
                  <span className="px-3 py-2 rounded-xl bg-white border border-[#efefef] text-[#b2566e]">
                    {page} / {totalPages}
                  </span>
                  <Button variant="ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                    下一页 / 次へ
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 3) 公演名一括 / 批量检索 */}
        {tab === "batch" && (
          <div className="grid lg:grid-cols-3 gap-8">
            <Card title="批量条件 / バッチ条件" className="lg:col-span-1"
              subtitle={<div className="text-[12.5px] text-[#6b7280]">按公演名称关键词批量检索场刊与相关链接（内部复用 Program 搜索）。</div>}>
              <div className="space-y-4 text-[14px]">
                <div>
                  <Label>年度 / Year</Label>
                  <Input value={batchYear} onChange={setBatchYear} type="number" />
                </div>
                <div>
                  <Label>公演名关键词（空格 AND）/ 公演名キーワード（スペース AND）</Label>
                  <Input value={batchTitle} onChange={setBatchTitle} placeholder="例：Goethe 花組" />
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={runBatch} disabled={batchLoading}>
                    {batchLoading ? (
                      <>
                        <Feather className="animate-spin text-[#d67b96]" size={16} /> 実行中 / 执行中
                      </>
                    ) : (
                      <>开始 / 開始</>
                    )}
                  </Button>
                  <Button variant="soft" onClick={loadGoethePreset} disabled={batchLoading}>
                    载入 Goethe 预设
                  </Button>
                </div>
              </div>
            </Card>

            <Card
              title="结果 / 結果"
              right={
                <>
                  <Button variant="ghost" onClick={() => downloadCSV("batch_results.csv", batchRows)}>
                    <Download size={16} />
                    CSV
                  </Button>
                  <Button variant="ghost" onClick={() => copyLinks(batchRows)}>
                    <Copy size={16} />
                    复制链接
                  </Button>
                </>
              }
              className="lg:col-span-2"
            >
              {batchLoading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[14px]">
                    <thead>
                      <tr className="text-[#6b7280]">
                        <th className="py-2 pr-4">标题 / Title</th>
                        <th className="py-2 pr-4">链接/图片 / Link/Image</th>
                        <th className="py-2">读取 / 読み取り</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchRows.map((r, i) => {
                        const img = r?.image_url || r?.image || r?.img || r?.thumb || r?.imageLink;
                        return (
                          <tr key={i} className="border-t border-[#efefef] hover:bg-[#fafafa]">
                            <td className="py-3 pr-4">
                              <a className="text-[#b2566e] underline inline-flex items-center gap-1" href={r.url} target="_blank" rel="noreferrer">
                                {r.title}
                                <ExternalLink size={14} />
                              </a>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2">
                                {img ? (
                                  <>
                                    <img
                                      onClick={() => openImage(img, r.title)}
                                      className="h-14 rounded-xl border border-[#efefef] hover:shadow hover:scale-[1.02] transition cursor-zoom-in"
                                      src={img}
                                      alt="thumb"
                                    />
                                    <a className="text-sm text-[#b2566e] underline" href={img} download target="_blank" rel="noreferrer">
                                      下载 / download
                                    </a>
                                  </>
                                ) : (
                                  <span className="text-xs text-[#9aa0a6] inline-flex items-center gap-1">
                                    <ImageIcon size={14} />
                                    无图 / no image
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3">
                              <Button variant="soft" onClick={() => readImageLink(r)}>
                                <LinkIcon size={16} />
                                读取 / 読む
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {(gForum.length > 0 || gUmeda.length > 0) && (
                <div className="mt-8 space-y-8">
                  <div>
                    <div className="font-semibold mb-2 text-[15px]">Forum（2511161）</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[14px]">
                        <thead>
                          <tr className="text-[#6b7280]">
                            <th className="py-2 pr-4">SS</th>
                            <th className="py-2 pr-4">尾码 / Tail</th>
                            <th className="py-2 pr-4">状态 / Status</th>
                            <th className="py-2 pr-4">标题 / タイトル</th>
                            <th className="py-2 pr-4">链接 / リンク</th>
                            <th className="py-2 pr-4">图片 / 画像</th>
                            <th className="py-2">读取 / 読み取り</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gForum.map((r, i) => (
                            <tr key={i} className="border-t border-[#efefef] hover:bg-[#fafafa]">
                              <td className="py-3 pr-4">{r.ss}</td>
                              <td className="py-3 pr-4">{r.tail ?? ""}</td>
                              <td className="py-3 pr-4">{r.status}</td>
                              <td className="py-3 pr-4">{r.title || ""}</td>
                              <td className="py-3 pr-4">
                                {r.url ? (
                                  <a className="text-[#b2566e] underline" href={r.url} target="_blank" rel="noreferrer">
                                    打开 / open
                                  </a>
                                ) : (
                                  ""
                                )}
                              </td>
                              <td className="py-3">
                                {r.image_url ? (
                                  <img
                                    onClick={() => openImage(r.image_url, r.title)}
                                    className="h-16 rounded-xl border border-[#efefef] hover:shadow hover:scale-[1.02] transition cursor-zoom-in"
                                    src={r.image_url}
                                    alt="thumb"
                                  />
                                ) : (
                                  ""
                                )}
                              </td>
                              <td className="py-3">
                                <Button variant="soft" onClick={() => readImageLink(r)}>
                                  <LinkIcon size={16} />
                                  读取 / 読む
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold mb-2 text-[15px]">Umeda（2512011）</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[14px]">
                        <thead>
                          <tr className="text-[#6b7280]">
                            <th className="py-2 pr-4">SS</th>
                            <th className="py-2 pr-4">尾码 / Tail</th>
                            <th className="py-2 pr-4">状态 / Status</th>
                            <th className="py-2 pr-4">标题 / タイトル</th>
                            <th className="py-2 pr-4">链接 / リンク</th>
                            <th className="py-2 pr-4">图片 / 画像</th>
                            <th className="py-2">读取 / 読み取り</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gUmeda.map((r, i) => (
                            <tr key={i} className="border-t border-[#efefef] hover:bg-[#fafafa]">
                              <td className="py-3 pr-4">{r.ss}</td>
                              <td className="py-3 pr-4">{r.tail ?? ""}</td>
                              <td className="py-3 pr-4">{r.status}</td>
                              <td className="py-3 pr-4">{r.title || ""}</td>
                              <td className="py-3 pr-4">
                                {r.url ? (
                                  <a className="text-[#b2566e] underline" href={r.url} target="_blank" rel="noreferrer">
                                    打开 / open
                                  </a>
                                ) : (
                                  ""
                                )}
                              </td>
                              <td className="py-3">
                                {r.image_url ? (
                                  <img
                                    onClick={() => openImage(r.image_url, r.title)}
                                    className="h-16 rounded-xl border border-[#efefef] hover:shadow hover:scale-[1.02] transition cursor-zoom-in"
                                    src={r.image_url}
                                    alt="thumb"
                                  />
                                ) : (
                                  ""
                                )}
                              </td>
                              <td className="py-3">
                                <Button variant="soft" onClick={() => readImageLink(r)}>
                                  <LinkIcon size={16} />
                                  读取 / 読む
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </Container>

      {/* 图片 Modal */}
      <ImageModal src={modalSrc} open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} />
    </div>
  );
}
