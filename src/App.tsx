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
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/**
 * Takarazuka Link Finder — 双语 UI / 高级渐变 + 微纹理 / Tab 分栏
 * - 视觉：象牙白基底 + 玫瑰粉渐变 + 极淡噪点纹理；更大更沉稳的字号
 * - 双语：中文 / 日本語（控件、标签、表头均双语）
 * - 布局：三大 Tab（BRO 探测 / 公演プログラム / Goethe 一括）
 * - 交互：图片 Modal、BRO 渐进进度条、复制链接、CSV 导出、读取图片直链
 * - API：VITE_API_BASE 环境变量（Vercel 配置）
 */

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

/* ------------------------ 基础 UI ------------------------ */
const Container: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className, children }) => (
  <div className={`mx-auto px-6 ${className || ""}`} style={{ maxWidth: 1200 }}>
    {children}
  </div>
);

/** 高级卡片：顶部渐变发丝线 + 轻阴影 + 稍大内边距 */
const Card: React.FC<React.PropsWithChildren<{ className?: string; title?: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode }>> = ({ className, children, title, subtitle, right }) => (
  <div
    className={
      "rounded-2xl border bg-white shadow-[0_10px_30px_rgba(20,20,20,0.06)] border-[#eee] " +
      "relative overflow-hidden " +
      (className || "")
    }
  >
    {/* 顶部渐变发丝线 */}
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

const SectionTitle: React.FC<React.PropsWithChildren> = ({ children }) => (
  <h2 className="text-[18px] md:text-[20px] font-semibold text-[#1f2328]">{children}</h2>
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

const Badge: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className, children }) => (
  <span className={`inline-flex items-center rounded-full text-[12px] px-2.5 py-1 bg-[#fff5f7] border border-[#ffd7e2] text-[#7a4a55] ${className || ""}`}>
    {children}
  </span>
);

/* ------------------------ 工具函数 ------------------------ */
const toCSV = (rows: any[], headers?: string[]) => {
  if (!rows?.length) return "";
  const cols = headers || Object.keys(rows[0]);
  const esc = (s: any) => '"' + String(s ?? "").replace(/"/g, '""') + '"';
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
};
const downloadCSV = (filename: string, rows: any[], headers?: string[]) => {
  const csv = toCSV(rows, headers);
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }); // 带 BOM 防乱码
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
};
const copyLinks = (rows: any[]) => {
  const txt = rows.filter((r) => r?.url).map((r) => r.url).join("\n");
  navigator.clipboard.writeText(txt || "");
  toast.info("已复制 / コピーしました！", { position: "bottom-right" });
};

/* ------------------------ Skeleton ------------------------ */
const SkeletonRow: React.FC = () => (
  <div className="animate-pulse h-12 w-full bg-[#f5f6f8] rounded-lg mb-2" />
);

/* ------------------------ 图片 Modal ------------------------ */
const ImageModal: React.FC<{ src: string; open: boolean; onClose: () => void; title?: string }> = ({
  src,
  open,
  onClose,
  title,
}) => {
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };
  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", escHandler);
    return () => window.removeEventListener("keydown", escHandler);
  }, [open]);

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
                <button
                  onClick={onClose}
                  className="text-[#6b7280] hover:text-[#1f2328] inline-flex items-center"
                  aria-label="Close"
                >
                  <X size={22} />
                </button>
              </div>
              <div className="p-2">
                {src ? (
                  <img src={src} className="w-full" />
                ) : (
                  <div className="h-96 grid place-items-center text-[#6b7280]">
                    <ImageIcon className="opacity-60" />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ------------------------ 主界面 ------------------------ */
type TabKey = "bro" | "program" | "goethe";

export default function App() {
  /* Tab */
  const [tab, setTab] = useState<TabKey>("bro");

  /* BRO 状态 */
  const [prefix, setPrefix] = useState("2511161"); // Goethe Forum 默认
  const [ssMin, setSsMin] = useState("1");
  const [ssMax, setSsMax] = useState("40");
  const [broRows, setBroRows] = useState<any[]>([]);
  const [broLoading, setBroLoading] = useState(false);
  const [broProgress, setBroProgress] = useState(0);
  const progressTimer = useRef<number | null>(null);

  /* Program 状态 */
  const [year, setYear] = useState("2025");
  const [q, setQ] = useState("Goethe 花組");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [prgRows, setPrgRows] = useState<any[]>([]);
  const [prgLoading, setPrgLoading] = useState(false);

  /* Goethe 状态 */
  const [gForum, setGForum] = useState<any[]>([]);
  const [gUmeda, setGUmeda] = useState<any[]>([]);
  const [gProgram, setGProgram] = useState<any[]>([]);
  const [gLoading, setGLoading] = useState(false);

  /* 图片 Modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSrc, setModalSrc] = useState("");
  const [modalTitle, setModalTitle] = useState("");

  /* Program 分页 */
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(prgRows.length / pageSize)),
    [prgRows.length, pageSize]
  );
  const prgPageRows = useMemo(
    () => prgRows.slice((page - 1) * pageSize, page * pageSize),
    [prgRows, page, pageSize]
  );

  /* ------------------- API ------------------- */
  const runBRO = async () => {
    try {
      setBroLoading(true);
      setBroProgress(0);
      setBroRows([]);

      let p = 0;
      progressTimer.current = window.setInterval(() => {
        p = Math.min(90, p + Math.random() * 12);
        setBroProgress(p);
      }, 180);

      const params = new URLSearchParams({ prefix, ss_min: ssMin, ss_max: ssMax });
      const res = await fetch(`${API_BASE}/api/bro?${params.toString()}`);
      if (!res.ok) throw new Error("BRO API failed");
      const data = await res.json();
      setBroRows(data?.results || []);

      setBroProgress(100);
      setTimeout(() => setBroProgress(0), 500);
      toast.success(`BRO 命中 ${data?.results?.filter((r: any) => r.url).length} 件`, { position: "bottom-right" });
    } catch {
      setBroProgress(0);
      toast.error("BRO 获取失败 / 取得に失敗しました", { position: "bottom-right" });
    } finally {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
      setBroLoading(false);
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
      toast.success(`プログラム命中 / 命中 ${data?.results?.length} 件`, { position: "bottom-right" });
    } catch {
      toast.error("プログラム获取失败 / 取得に失敗しました", { position: "bottom-right" });
    } finally {
      setPrgLoading(false);
    }
  };

  const runGoethe = async () => {
    try {
      setGLoading(true);
      const res = await fetch(`${API_BASE}/api/goethe`);
      if (!res.ok) throw new Error("Goethe API failed");
      const data = await res.json();
      setGForum(data?.forum || []);
      setGUmeda(data?.umeda || []);
      setGProgram(data?.program || []);
      toast.success("Goethe 一括取得 完了", { position: "bottom-right" });
    } catch {
      toast.error("Goethe 一括取得失败 / 取得に失敗しました", { position: "bottom-right" });
    } finally {
      setGLoading(false);
    }
  };

  /* 复制单条链接 */
  const copySingle = (url?: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.info("已复制 / コピーしました！", { position: "bottom-right" });
  };

  /* 读取图片直链 */
  const readImageLink = (row: any) => {
    const link = row?.image_url;
    if (link) {
      navigator.clipboard.writeText(link);
      toast.success("已读取图片直链（已复制）/ 画像リンクを読み取りました（コピー済）", { position: "bottom-right" });
    } else {
      toast.warn("未找到该行图片 / この行には画像がありません", { position: "bottom-right" });
    }
  };

  /* 打开图片 Modal */
  const openImage = (src?: string, title?: string) => {
    if (!src) return;
    setModalSrc(src);
    setModalTitle(title || "");
    setModalOpen(true);
  };

  /* ------------------- 渲染 ------------------- */
  return (
    <div
      className="
        min-h-screen text-[#1f2328]
        font-[Inter,_Noto_Sans_JP,system-ui,sans-serif]
        bg-[linear-gradient(180deg,#fffdfb,rgba(255,245,248,0.6)),radial-gradient(1200px_600px_at_20%_-10%,rgba(255,214,227,0.35),transparent),radial-gradient(1000px_500px_at_110%_10%,rgba(216,231,255,0.35),transparent)]
        relative
      "
      style={{
        // 极淡“纸质”噪点纹理
        backgroundImage:
          "linear-gradient(180deg,#fffdfb,rgba(255,245,248,0.7)),radial-gradient(1200px 600px at 20% -10%,rgba(255,214,227,0.35),transparent),radial-gradient(1000px 500px at 110% 10%,rgba(216,231,255,0.35),transparent),repeating-linear-gradient(45deg,rgba(0,0,0,0.015) 0, rgba(0,0,0,0.015) 2px, rgba(0,0,0,0.01) 2px, rgba(0,0,0,0.01) 4px)",
      }}
    >
      <ToastContainer position="bottom-right" autoClose={1800} newestOnTop closeOnClick draggable theme="light" />

      {/* 顶部 */}
      <div className="border-b border-[#efefef] bg-white/80 backdrop-blur-[2px] sticky top-0 z-30">
        <Container className="py-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="text-[24px] md:text-[28px] font-semibold tracking-tight"
              >
                Takarazuka Link Finder
              </motion.h1>
              {/* 按你的要求：去掉副标题 */}
            </div>
          </div>

          {/* Tabs（双语） */}
          <div className="mt-4">
            <div className="flex flex-wrap gap-8">
              {[
                { key: "bro", jp: "BRO 探測", cn: "BRO 链接推测", icon: <Search size={16} /> },
                { key: "program", jp: "公演プログラム", cn: "公演册检索", icon: <Feather size={16} /> },
                { key: "goethe", jp: "Goethe 一括", cn: "Goethe 批量", icon: <Stars size={16} /> },
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
        {/* BRO 面板 */}
        {tab === "bro" && (
          <div className="grid lg:grid-cols-3 gap-8">
            <Card
              title={
                <span>
                  参数 / パラメータ
                </span>
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
                  <Button onClick={runBRO} disabled={broLoading}>
                    {broLoading ? (
                      <>
                        <Feather className="animate-spin text-[#d67b96]" size={16} /> 执行中 / 実行中
                      </>
                    ) : (
                      <>开始检索 / 検索開始</>
                    )}
                  </Button>
                </div>

                {/* 进度条 */}
                <div className="h-2 rounded-full bg-[#f1f3f4] overflow-hidden mt-2">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#ffd7e2] via-[#fbd1dd] to-[#ffd9c2]"
                    initial={{ width: 0 }}
                    animate={{ width: `${broProgress}%` }}
                    transition={{ ease: "easeOut", duration: 0.2 }}
                  />
                </div>
              </div>
            </Card>

            <Card
              title={<span>结果 / 結果</span>}
              right={
                <>
                  <Button variant="ghost" onClick={() => downloadCSV("bro_results.csv", broRows)}>
                    <Download size={16} />
                    CSV 导出
                  </Button>
                  <Button variant="ghost" onClick={() => copyLinks(broRows)}>
                    <Copy size={16} />
                    复制链接
                  </Button>
                </>
              }
              className="lg:col-span-2"
            >
              {broLoading ? (
                <>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </>
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
                      {broRows.map((r, i) => (
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

        {/* Program 面板 */}
        {tab === "program" && (
          <div className="grid lg:grid-cols-3 gap-8">
            <Card title={<span>搜索条件 / 検索条件</span>} className="lg:col-span-1">
              <div className="space-y-4 text-[14px]">
                <div>
                  <Label>年度 / Year</Label>
                  <Input value={year} onChange={setYear} type="number" />
                </div>
                <div>
                  <Label>关键词（空格 AND）/ キーワード（スペース区切り AND）</Label>
                  <Input value={q} onChange={setQ} placeholder="Goethe 花組" />
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
                      <Feather className="animate-spin text-[#d67b96]" size={16} /> 检索中 / 検索中
                    </>
                  ) : (
                    <>开始 / 開始</>
                  )}
                </Button>
              </div>
            </Card>

            <Card
              title={<span>结果 / 結果</span>}
              right={
                <>
                  <Button variant="ghost" onClick={() => downloadCSV("program_results.csv", prgRows)}>
                    <Download size={16} />
                    CSV 导出
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
                <>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[14px]">
                    <thead>
                      <tr className="text-[#6b7280]">
                        <th className="py-2 pr-4">标题 / Title</th>
                        <th className="py-2 pr-4">发售日 / Release</th>
                        <th className="py-2 pr-4">价格 / Price</th>
                        <th className="py-2 pr-4">编码 / Code</th>
                        <th className="py-2 pr-4">会场 / Venue</th>
                        <th className="py-2 pr-4">链接/图片 / Link/Image</th>
                        <th className="py-2">读取 / 読み取り</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prgPageRows.map((r, i) => (
                        <tr key={i} className="border-t border-[#efefef] hover:bg-[#fafafa]">
                          <td className="py-3 pr-4">
                            <a className="text-[#b2566e] underline inline-flex items-center gap-1" href={r.url} target="_blank" rel="noreferrer">
                              {r.title}
                              <ExternalLink size={14} />
                            </a>
                          </td>
                          <td className="py-3 pr-4">{r.release_date}</td>
                          <td className="py-3 pr-4 text-[#b2566e]">{r.price}</td>
                          <td className="py-3 pr-4">{r.code}</td>
                          <td className="py-3 pr-4">
                            <Badge>{r.venue_group}</Badge>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              {r.image_url ? (
                                <>
                                  <img
                                    onClick={() => openImage(r.image_url, r.title)}
                                    className="h-14 rounded-xl border border-[#efefef] hover:shadow hover:scale-[1.02] transition cursor-zoom-in"
                                    src={r.image_url}
                                    alt="thumb"
                                  />
                                  <a className="text-sm text-[#b2566e] underline" href={r.image_url} download target="_blank" rel="noreferrer">
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
                      ))}
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

        {/* Goethe 一括 面板 */}
        {tab === "goethe" && (
          <div className="grid lg:grid-cols-2 gap-8">
            <Card
              title={<span>Goethe 批量 / 一括</span>}
              right={<Button onClick={runGoethe} disabled={gLoading}>{gLoading ? "执行中…" : "开始 / 開始"}</Button>}
              className="lg:col-span-2"
            >
              {/* Forum */}
              <div className="mt-1">
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

              {/* Umeda */}
              <div className="mt-8">
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

              {/* Program from Goethe */}
              <div className="mt-8">
                <div className="font-semibold mb-2 text-[15px]">Program 检索 / 検索</div>
                <div className="flex gap-2 mb-2">
                  <Button variant="ghost" onClick={() => copyLinks(gProgram)}>
                    <Copy size={16} />
                    复制链接
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[14px]">
                    <thead>
                      <tr className="text-[#6b7280]">
                        <th className="py-2 pr-4">标题 / Title</th>
                        <th className="py-2 pr-4">发售日 / Release</th>
                        <th className="py-2 pr-4">价格 / Price</th>
                        <th className="py-2 pr-4">编码 / Code</th>
                        <th className="py-2 pr-4">会场 / Venue</th>
                        <th className="py-2 pr-4">链接/图片 / Link/Image</th>
                        <th className="py-2">读取 / 読み取り</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gProgram.map((r, i) => (
                        <tr key={i} className="border-t border-[#efefef] hover:bg-[#fafafa]">
                          <td className="py-3 pr-4">{r.title}</td>
                          <td className="py-3 pr-4">{r.release_date}</td>
                          <td className="py-3 pr-4 text-[#b2566e]">{r.price}</td>
                          <td className="py-3 pr-4">{r.code}</td>
                          <td className="py-3 pr-4">
                            <Badge>{r.venue_group}</Badge>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              {r.image_url ? (
                                <>
                                  <img
                                    onClick={() => openImage(r.image_url, r.title)}
                                    className="h-14 rounded-xl border border-[#efefef] hover:shadow hover:scale-[1.02] transition cursor-zoom-in"
                                    src={r.image_url}
                                    alt="thumb"
                                  />
                                  <a className="text-sm text-[#b2566e] underline" href={r.image_url} download target="_blank" rel="noreferrer">
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Container>

      {/* 图片 Modal */}
      <ImageModal src={modalSrc} open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} />
    </div>
  );
}
