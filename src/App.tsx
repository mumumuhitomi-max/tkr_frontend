import React, { useEffect, useMemo, useState } from "react";
import { Search, Image as ImageIcon, ExternalLink, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

type CardItem = { url: string; code: string; title?: string };
type ImagesResp = {
  code: string;
  card_url?: string;
  title?: string;
  card_image?: string;
  special_images?: string[];
  embedded_prefixes?: string[];
  troupe_digit?: string;
  prefix_groups?: Record<string, string[]>;
  error?: string;
  message?: string;
};

type ProgramRow = {
  title: string;
  url: string;
};

type ProgramResp = {
  year: number;
  queries: string[];
  results: ProgramRow[];
  error?: string;
  message?: string;
};

const API_BASE = (import.meta as any).env?.VITE_API_BASE || "http://127.0.0.1:8000";

function cx(...arr: (string | false | undefined | null)[]) {
  return arr.filter(Boolean).join(" ");
}

const GlassCard: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className, children }) => (
  <div
    className={cx(
      "rounded-2xl border border-black/10 bg-white/70 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)]",
      className
    )}
  >
    {children}
  </div>
);

const PrimaryBtn: React.FC<
  React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean; className?: string }>
> = ({ onClick, disabled, className, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cx(
      "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-semibold",
      "bg-gradient-to-r from-[#111827] to-[#0b1020] text-white shadow-sm",
      "hover:shadow-[0_12px_30px_rgba(15,23,42,0.25)] hover:scale-[1.01] active:scale-[0.99] transition",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
      className
    )}
  >
    {children}
  </button>
);

const SoftBtn: React.FC<
  React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean; className?: string }>
> = ({ onClick, disabled, className, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cx(
      "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-semibold",
      "bg-white text-[#111827] border border-black/10",
      "hover:bg-[#fff7f8] hover:border-[#e7bcb5] hover:shadow-[0_10px_24px_rgba(231,188,181,0.25)] hover:scale-[1.01] active:scale-[0.99] transition",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
      className
    )}
  >
    {children}
  </button>
);

const Input: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder, className }) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={cx(
      "w-full rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-[14px] outline-none",
      "focus:border-[#e7bcb5] focus:ring-2 focus:ring-[#f5d6d2]",
      className
    )}
  />
);

const MiniLabel: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="text-[12px] text-[#6b7280]">{children}</div>
);

const Modal: React.FC<{
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ open, title, onClose, children }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <motion.div
          className="relative z-10 w-[min(1100px,94vw)] max-h-[86vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-black/10"
          initial={{ y: 16, scale: 0.98, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 16, scale: 0.98, opacity: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 bg-gradient-to-r from-[#fffaf5] via-white to-[#fff1f2]">
            <div className="text-[15px] font-semibold text-[#111827]">
              {title || "画像 / 画像一覧"}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-black/5 transition"
              aria-label="close"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-5 overflow-auto max-h-[calc(86vh-64px)]">{children}</div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

function copy(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success("已复制 / コピーしました！"),
    () => toast.error("复制失败 / コピー失敗")
  );
}

export default function App() {
  const [tab, setTab] = useState<"cards" | "program">("cards");

  // Tab1: cards
  const [keyword, setKeyword] = useState("コレクションカード");
  const [filter, setFilter] = useState(""); // 作品名过滤（可空）
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [selected, setSelected] = useState<CardItem | null>(null);

  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesResp, setImagesResp] = useState<ImagesResp | null>(null);

  // Modal for large preview
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImg, setModalImg] = useState<string>("");

  // Tab2: program
  const [year, setYear] = useState("2025");
  const [programQ, setProgramQ] = useState("花組");
  const [programLoading, setProgramLoading] = useState(false);
  const [programResp, setProgramResp] = useState<ProgramResp | null>(null);

  const filterTokens = useMemo(() => {
    return filter
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [filter]);

  async function fetchCards() {
    setCardsLoading(true);
    setCards([]);
    setSelected(null);
    setImagesResp(null);
    try {
      const params = new URLSearchParams();
      params.set("keyword", keyword.trim() || "コレクションカード");
      // title_filter 可重复参数
      filterTokens.forEach((t) => params.append("title_filter", t));
      params.set("max_pages", "10");
      params.set("timeout", "15");
      const url = `${API_BASE}/api/cards?${params.toString()}`;
      const r = await fetch(url);
      const j = await r.json();
      if (j?.results) setCards(j.results);
      else setCards([]);
      if (!j?.results?.length) toast.info("无结果 / 該当なし");
    } catch (e: any) {
      toast.error(`检索失败 / 検索失敗：${String(e)}`);
    } finally {
      setCardsLoading(false);
    }
  }

  async function fetchImagesForCard(card: CardItem) {
    setImagesLoading(true);
    setImagesResp(null);
    try {
      const params = new URLSearchParams();
      params.set("card_url", card.url);
      params.set("max_images", "200");
      params.set("dd_scan_max", "20"); // 扫到 20 日，覆盖 01/02/11 等常见情况
      params.set("timeout", "15");
      const url = `${API_BASE}/api/images?${params.toString()}`;
      const r = await fetch(url);
      const j = (await r.json()) as ImagesResp;
      setImagesResp(j);
      if (j?.error) toast.error(`探图失败 / 探索失敗：${j.message || j.error}`);
      else toast.success("探图完成 / 取得完了");
    } catch (e: any) {
      toast.error(`探图失败 / 探索失敗：${String(e)}`);
    } finally {
      setImagesLoading(false);
    }
  }

  async function fetchProgram() {
    setProgramLoading(true);
    setProgramResp(null);
    try {
      const y = parseInt(year || "2025", 10) || 2025;
      const params = new URLSearchParams();
      params.set("year", String(y));
      // 你的后端 program API 里 q 是 List[str]，我们支持空格分词
      (programQ || "")
        .split(/\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((t) => params.append("q", t));
      params.set("timeout", "15");
      params.set("delay_min", "0.6");
      params.set("delay_max", "1.5");
      const url = `${API_BASE}/api/program?${params.toString()}`;
      const r = await fetch(url);
      const j = (await r.json()) as ProgramResp;
      setProgramResp(j);
      if (!j?.results?.length) toast.info("无结果 / 該当なし");
    } catch (e: any) {
      toast.error(`检索失败 / 検索失敗：${String(e)}`);
    } finally {
      setProgramLoading(false);
    }
  }

  const allImagesFlat = useMemo(() => {
    if (!imagesResp) return [];
    const arr: { group: string; url: string }[] = [];
    if (imagesResp.card_image) arr.push({ group: "小卡 / カード", url: imagesResp.card_image });
    (imagesResp.special_images || []).forEach((u) => arr.push({ group: "特殊画像 / 特殊", url: u }));
    const pg = imagesResp.prefix_groups || {};
    Object.keys(pg).forEach((p) => {
      pg[p].forEach((u) => arr.push({ group: `Prefix ${p}（舞写/定妆）`, url: u }));
    });
    return arr;
  }, [imagesResp]);

  return (
    <div className="min-h-screen bg-[radial-gradient(1100px_circle_at_15%_8%,rgba(255,241,242,0.95),transparent_55%),radial-gradient(900px_circle_at_88%_20%,rgba(255,250,245,1),transparent_52%),linear-gradient(180deg,#ffffff 0%,#fffaf5 45%,#ffffff 100%)]">
      <ToastContainer position="bottom-right" autoClose={1800} hideProgressBar theme="light" />

      <div className="mx-auto max-w-6xl px-5 py-8">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[22px] md:text-[28px] font-extrabold tracking-tight text-[#111827]">
              宝塚 ONLINE 商品リンク探測
            </div>
            <div className="text-[12px] md:text-[13px] text-[#6b7280]">
              中文 / 日本語｜小卡检索 → 一键探图｜场刊链接检索
            </div>
          </div>

          <GlassCard className="px-4 py-3">
            <div className="text-[12px] text-[#6b7280]">
              API Base：<span className="font-mono text-[#111827]">{API_BASE}</span>
            </div>
          </GlassCard>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setTab("cards")}
            className={cx(
              "px-4 py-2 rounded-xl text-[14px] font-semibold border transition",
              tab === "cards"
                ? "bg-[#111827] text-white border-[#111827]"
                : "bg-white/70 text-[#111827] border-black/10 hover:border-[#e7bcb5]"
            )}
          >
            小卡检索・一键探图 / カード検索・探図
          </button>
          <button
            onClick={() => setTab("program")}
            className={cx(
              "px-4 py-2 rounded-xl text-[14px] font-semibold border transition",
              tab === "program"
                ? "bg-[#111827] text-white border-[#111827]"
                : "bg-white/70 text-[#111827] border-black/10 hover:border-[#e7bcb5]"
            )}
          >
            公演プログラム / 场刊检索
          </button>
        </div>

        {/* Content */}
        {tab === "cards" && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
            {/* Left: Search panel */}
            <GlassCard className="p-5">
              <div className="text-[16px] font-semibold text-[#111827]">步骤 / 手順</div>
              <div className="mt-2 space-y-2 text-[13px] text-[#374151] leading-relaxed">
                <div>1) 先点「检索小卡 / 検索」拿到商品小卡列表。</div>
                <div>2) 选中某条小卡后，点「探图 / 探索」会自动尝试：</div>
                <div className="pl-4 text-[#6b7280]">
                  ・小卡图：<span className="font-mono">/img/goods/L/&#123;code&#125;.jpg</span><br />
                  ・特殊图：<span className="font-mono">/img/goods/L/&#123;code2&#125;.jpg</span><br />
                  ・舞写/定妆：<span className="font-mono">/img/goods/S/&#123;prefix&#125;-001..200.jpg</span><br />
                  ・同一公演可能存在多套 prefix（大剧场 / 东京 / 新人等），系统会自动探测并分组返回。
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <div>
                  <MiniLabel>关键词 / キーワード（默认：コレクションカード）</MiniLabel>
                  <Input value={keyword} onChange={setKeyword} placeholder="コレクションカード" />
                </div>
                <div>
                  <MiniLabel>作品过滤 / 作品フィルター（可留空，支持空格分词）</MiniLabel>
                  <Input value={filter} onChange={setFilter} placeholder="例：Goethe 花組 / ゲーテ 花組" />
                </div>

                <div className="flex gap-2">
                  <PrimaryBtn onClick={fetchCards} disabled={cardsLoading}>
                    {cardsLoading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                    检索小卡 / 検索
                  </PrimaryBtn>
                  <SoftBtn
                    onClick={() => {
                      setCards([]);
                      setSelected(null);
                      setImagesResp(null);
                      toast.info("已清空 / クリア");
                    }}
                  >
                    清空 / クリア
                  </SoftBtn>
                </div>
              </div>
            </GlassCard>

            {/* Right: Results */}
            <div className="space-y-4">
              {/* Cards list */}
              <GlassCard className="p-5">
                <div className="flex items-center justify-between">
                  <div className="text-[16px] font-semibold text-[#111827]">小卡结果 / カード一覧</div>
                  <div className="text-[12px] text-[#6b7280]">
                    {cards.length ? `共 ${cards.length} 条 / ${cards.length} 件` : "—"}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cards.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => {
                        setSelected(c);
                        setImagesResp(null);
                        toast.info("已选中 / 選択しました");
                      }}
                      className={cx(
                        "text-left rounded-2xl border p-4 transition",
                        selected?.code === c.code
                          ? "border-[#e7bcb5] bg-[#fff1f2]/40 shadow-[0_10px_24px_rgba(231,188,181,0.20)]"
                          : "border-black/10 bg-white/70 hover:border-[#e7bcb5]"
                      )}
                    >
                      <div className="text-[12px] text-[#6b7280] font-mono">{c.code}</div>
                      <div className="mt-1 text-[14px] font-semibold text-[#111827] line-clamp-2">
                        {c.title && c.title.trim() ? c.title : "（标题未取回 / タイトル未取得）"}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#111827] hover:underline"
                        >
                          打开商品页 / 商品ページ <ExternalLink size={14} />
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copy(c.url);
                          }}
                          className="text-[12px] text-[#6b7280] hover:text-[#111827] underline underline-offset-4"
                        >
                          复制链接 / コピー
                        </button>
                      </div>
                    </button>
                  ))}
                </div>

                {!cards.length && (
                  <div className="mt-4 text-[13px] text-[#6b7280]">
                    这里会显示小卡商品链接。先在左侧点击「检索小卡 / 検索」。
                  </div>
                )}
              </GlassCard>

              {/* Probe */}
              <GlassCard className="p-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-[16px] font-semibold text-[#111827]">探图 / 探索</div>
                    <div className="text-[12px] text-[#6b7280]">
                      不需要切换页面：选中小卡后直接探图，返回小卡 / 特殊 / 多套prefix图片。
                    </div>
                  </div>

                  <PrimaryBtn
                    onClick={() => {
                      if (!selected) return toast.info("请先选中一条小卡 / 先にカードを選択");
                      fetchImagesForCard(selected);
                    }}
                    disabled={!selected || imagesLoading}
                  >
                    {imagesLoading ? <Loader2 className="animate-spin" size={16} /> : <ImageIcon size={16} />}
                    探图 / 探索
                  </PrimaryBtn>
                </div>

                {/* Results */}
                <div className="mt-4">
                  {!imagesResp && (
                    <div className="text-[13px] text-[#6b7280]">
                      选中小卡后点击「探图 / 探索」，结果会显示在这里。
                    </div>
                  )}

                  {imagesResp && !imagesResp.error && (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-black/10 bg-white/60 p-4">
                        <div className="text-[14px] font-semibold text-[#111827]">
                          {imagesResp.title && imagesResp.title.trim()
                            ? imagesResp.title
                            : "（标题未取回 / タイトル未取得）"}
                        </div>
                        <div className="mt-1 text-[12px] text-[#6b7280] font-mono">
                          code: {imagesResp.code}　troupe: {imagesResp.troupe_digit || "-"}
                        </div>
                      </div>

                      {/* Quick preview row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-2xl border border-black/10 bg-white/70 p-4">
                          <div className="text-[13px] font-semibold text-[#111827]">小卡 / カード</div>
                          {imagesResp.card_image ? (
                            <div className="mt-3">
                              <img
                                src={imagesResp.card_image}
                                className="w-full rounded-xl border border-black/10 hover:shadow-lg hover:scale-[1.01] transition cursor-zoom-in"
                                onClick={() => {
                                  setModalImg(imagesResp.card_image!);
                                  setModalOpen(true);
                                }}
                              />
                              <div className="mt-2 flex items-center justify-between text-[12px]">
                                <button className="underline text-[#6b7280]" onClick={() => copy(imagesResp.card_image!)}>
                                  复制链接 / コピー
                                </button>
                                <a className="underline font-semibold text-[#111827]" href={imagesResp.card_image} target="_blank" rel="noreferrer">
                                  打开 / 開く
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 text-[12px] text-[#6b7280]">无图 / なし</div>
                          )}
                        </div>

                        <div className="rounded-2xl border border-black/10 bg-white/70 p-4">
                          <div className="text-[13px] font-semibold text-[#111827]">特殊画像 / 特殊</div>
                          <div className="mt-2 text-[12px] text-[#6b7280]">
                            {imagesResp.special_images?.length ? `共 ${imagesResp.special_images.length} 张` : "无 / なし"}
                          </div>
                          {imagesResp.special_images?.slice(0, 1).map((u) => (
                            <div className="mt-3" key={u}>
                              <img
                                src={u}
                                className="w-full rounded-xl border border-black/10 hover:shadow-lg hover:scale-[1.01] transition cursor-zoom-in"
                                onClick={() => {
                                  setModalImg(u);
                                  setModalOpen(true);
                                }}
                              />
                            </div>
                          ))}
                        </div>

                        <div className="rounded-2xl border border-black/10 bg-white/70 p-4">
                          <div className="text-[13px] font-semibold text-[#111827]">Prefix 组 / Prefix</div>
                          <div className="mt-2 text-[12px] text-[#6b7280]">
                            {imagesResp.prefix_groups ? Object.keys(imagesResp.prefix_groups).length : 0} 组
                          </div>
                          <div className="mt-3 space-y-2">
                            {imagesResp.prefix_groups &&
                              Object.keys(imagesResp.prefix_groups).slice(0, 3).map((p) => (
                                <div key={p} className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-3 py-2">
                                  <div className="text-[12px] font-mono text-[#111827]">{p}</div>
                                  <div className="text-[12px] text-[#6b7280]">
                                    {imagesResp.prefix_groups?.[p]?.length || 0} 张
                                  </div>
                                </div>
                              ))}
                            {!imagesResp.prefix_groups || !Object.keys(imagesResp.prefix_groups).length ? (
                              <div className="text-[12px] text-[#6b7280]">未探测到 / 見つかりません</div>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* All images */}
                      <div className="flex items-center justify-between">
                        <div className="text-[15px] font-semibold text-[#111827]">全部图片 / 全画像</div>
                        <SoftBtn
                          onClick={() => {
                            // 复制全部链接（谨慎：可能很多）
                            const text = allImagesFlat.map((x) => x.url).join("\n");
                            copy(text);
                          }}
                          disabled={!allImagesFlat.length}
                        >
                          复制全部链接 / 全コピー
                        </SoftBtn>
                      </div>

                      {!allImagesFlat.length ? (
                        <div className="text-[13px] text-[#6b7280]">无结果 / なし</div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          {allImagesFlat.slice(0, 120).map((it, idx) => (
                            <div key={it.url + idx} className="group">
                              <div className="text-[11px] text-[#6b7280] line-clamp-1">{it.group}</div>
                              <img
                                src={it.url}
                                loading="lazy"
                                className="mt-1 w-full aspect-[3/4] object-cover rounded-xl border border-black/10 bg-white cursor-zoom-in group-hover:shadow-lg group-hover:scale-[1.01] transition"
                                onClick={() => {
                                  setModalImg(it.url);
                                  setModalOpen(true);
                                }}
                              />
                              <div className="mt-1 flex items-center justify-between text-[11px] text-[#6b7280]">
                                <button className="underline" onClick={() => copy(it.url)}>
                                  复制 / コピー
                                </button>
                                <a className="underline font-semibold text-[#111827]" href={it.url} target="_blank" rel="noreferrer">
                                  打开
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {allImagesFlat.length > 120 && (
                        <div className="text-[12px] text-[#6b7280]">
                          仅预览前 120 张（链接已完整返回，可复制全部链接）。/ プレビューは120枚まで
                        </div>
                      )}
                    </div>
                  )}

                  {imagesResp && imagesResp.error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
                      探图失败 / 探索失敗：{imagesResp.message || imagesResp.error}
                    </div>
                  )}
                </div>
              </GlassCard>
            </div>
          </div>
        )}

        {tab === "program" && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
            <GlassCard className="p-5">
              <div className="text-[16px] font-semibold text-[#111827]">场刊检索 / プログラム検索</div>
              <div className="mt-2 space-y-2 text-[13px] text-[#374151] leading-relaxed">
                <div>输入年份和关键词（例如：花組 / Goethe / 東京宝塚劇場）。</div>
                <div>结果只保留：<b>标题 + 链接</b>（你不想显示的字段已移除）。</div>
              </div>

              <div className="mt-4 grid gap-3">
                <div>
                  <MiniLabel>年份 / 年</MiniLabel>
                  <Input value={year} onChange={setYear} placeholder="2025" />
                </div>
                <div>
                  <MiniLabel>关键词 / キーワード（支持空格分词）</MiniLabel>
                  <Input value={programQ} onChange={setProgramQ} placeholder="例：花組 Goethe 東京宝塚劇場" />
                </div>
                <PrimaryBtn onClick={fetchProgram} disabled={programLoading}>
                  {programLoading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                  检索 / 検索
                </PrimaryBtn>
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-[16px] font-semibold text-[#111827]">结果 / 結果</div>
                <div className="text-[12px] text-[#6b7280]">
                  {programResp?.results?.length ? `共 ${programResp.results.length} 条` : "—"}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {programResp?.results?.map((row) => (
                  <div key={row.url} className="rounded-2xl border border-black/10 bg-white/70 p-4">
                    <div className="text-[14px] font-semibold text-[#111827]">{row.title}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px]">
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[#111827] hover:underline"
                      >
                        打开链接 / 開く <ExternalLink size={14} />
                      </a>
                      <button className="underline text-[#6b7280]" onClick={() => copy(row.url)}>
                        复制链接 / コピー
                      </button>
                    </div>
                  </div>
                ))}

                {!programResp?.results?.length && (
                  <div className="text-[13px] text-[#6b7280]">暂无结果 / なし</div>
                )}
              </div>
            </GlassCard>
          </div>
        )}

        <div className="mt-8 text-center text-[12px] text-[#6b7280]">
          Tip：如果线上访问不到结果，先确认前端的 <span className="font-mono">VITE_API_BASE</span> 指向正确的后端域名。
        </div>
      </div>

      <Modal
        open={modalOpen}
        title="画像プレビュー / 图片预览"
        onClose={() => {
          setModalOpen(false);
          setModalImg("");
        }}
      >
        {modalImg ? (
          <div className="space-y-3">
            <img src={modalImg} className="w-full rounded-2xl border border-black/10" />
            <div className="flex flex-wrap items-center gap-3">
              <SoftBtn onClick={() => copy(modalImg)}>复制链接 / コピー</SoftBtn>
              <a href={modalImg} target="_blank" rel="noreferrer">
                <PrimaryBtn>新标签打开 / 開く</PrimaryBtn>
              </a>
            </div>
            <div className="text-[12px] text-[#6b7280] font-mono break-all">{modalImg}</div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}