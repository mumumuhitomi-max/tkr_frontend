import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Image as ImageIcon, ExternalLink, X, Info, Wand2 } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

type CardItem = { url: string; code: string; title?: string };
type CardsResp = { keyword: string; title_filter: string[]; results: CardItem[]; error?: string; message?: string };

type CardImagesResp = {
  card_url: string;
  title?: string;
  code: string;
  prefix_candidates: string[];
  picked_prefix_S?: string | null;
  max_images: number;
  strategy?: Record<string, any>;
  images: string[];
  error?: string;
  message?: string;
};

const API_BASE = (import.meta as any).env?.VITE_API_BASE || "http://127.0.0.1:8000";

const cls = (...a: Array<string | false | undefined | null>) => a.filter(Boolean).join(" ");

const pill =
  "inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/70 px-2.5 py-1 text-xs text-black/70 backdrop-blur";
const cardWrap =
  "rounded-2xl border border-black/10 bg-white/70 shadow-[0_18px_60px_rgba(15,23,42,0.10)] backdrop-blur p-4 md:p-5";
const btn =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-[0.99]";
const btnPrimary =
  "bg-gradient-to-r from-[#f7d7da] via-[#fff] to-[#f4d6c8] text-[#111827] border border-[#e7bcb5]/60 shadow-[0_10px_30px_rgba(231,188,181,0.25)] hover:shadow-[0_12px_36px_rgba(231,188,181,0.35)]";
const btnGhost =
  "bg-white/60 border border-black/10 text-[#111827] hover:bg-white/80";

function useTabs<T extends string>(tabs: T[], initial: T) {
  const [tab, setTab] = useState<T>(initial);
  return { tab, setTab, tabs };
}

function Modal({
  open,
  onClose,
  src,
  title,
}: {
  open: boolean;
  onClose: () => void;
  src: string;
  title?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#111827] truncate">{title || "画像プレビュー / 图片预览"}</div>
                <div className="text-xs text-black/50 truncate">{src}</div>
              </div>
              <button className={cls(btn, btnGhost)} onClick={onClose}>
                <X size={16} /> Close
              </button>
            </div>
            <div className="bg-[#0b1220] p-3 md:p-5">
              <img src={src} alt="preview" className="mx-auto max-h-[78vh] w-auto rounded-xl shadow-2xl" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  const { tab, setTab, tabs } = useTabs(["cards", "images"] as const, "cards");

  // Step 1: cards search
  const [keyword, setKeyword] = useState("コレクションカード");
  const [titleFilter, setTitleFilter] = useState("Goethe");
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [pickedCard, setPickedCard] = useState<CardItem | null>(null);

  // Step 2: images probe
  const [extraPrefix, setExtraPrefix] = useState(""); // comma-separated
  const [maxImages, setMaxImages] = useState(200);
  const [startN, setStartN] = useState(1);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesResp, setImagesResp] = useState<CardImagesResp | null>(null);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSrc, setModalSrc] = useState("");

  const titleFiltersArr = useMemo(() => {
    const a = titleFilter
      .split(/[,\s]+/g)
      .map((x) => x.trim())
      .filter(Boolean);
    return a;
  }, [titleFilter]);

  const extraPrefixArr = useMemo(() => {
    return extraPrefix
      .split(/[,\s]+/g)
      .map((x) => x.trim())
      .filter(Boolean);
  }, [extraPrefix]);

  async function loadCards() {
    setCardsLoading(true);
    setCards([]);
    setPickedCard(null);
    setImagesResp(null);
    try {
      const u = new URL(`${API_BASE}/api/cards`);
      u.searchParams.set("keyword", keyword);
      for (const f of titleFiltersArr) u.searchParams.append("title_filter", f);
      const r = await fetch(u.toString());
      const j = (await r.json()) as CardsResp;
      setCards(j.results || []);
      if ((j.results || []).length === 0) toast.info("No cards found / 没找到小卡结果");
      else toast.success(`Found ${j.results.length} cards / 找到 ${j.results.length} 条小卡`);
    } catch (e: any) {
      toast.error(`Cards search failed: ${e?.message || e}`);
    } finally {
      setCardsLoading(false);
    }
  }

  async function loadImagesForCard(card: CardItem) {
    setImagesLoading(true);
    setImagesResp(null);
    try {
      const u = new URL(`${API_BASE}/api/card_images`);
      u.searchParams.set("card_url", card.url);
      u.searchParams.set("max_images", String(maxImages));
      u.searchParams.set("start_n", String(startN));
      for (const p of extraPrefixArr) u.searchParams.append("extra_prefix", p);
      const r = await fetch(u.toString());
      const j = (await r.json()) as CardImagesResp;

      setImagesResp(j);
      if ((j.images || []).length === 0) toast.warning("No images found / 没探测到图片");
      else toast.success(`Images: ${j.images.length} / 图片 ${j.images.length} 张`);
      setTab("images");
    } catch (e: any) {
      toast.error(`Image probe failed: ${e?.message || e}`);
    } finally {
      setImagesLoading(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("コピーしました！/ 已复制");
  }

  useEffect(() => {
    // 初次提示
    toast.info("Step 1：先搜小卡 → Step 2：点一条结果探图 / 先搜再探图");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_700px_at_20%_-10%,rgba(247,215,218,0.65),transparent_60%),radial-gradient(1000px_600px_at_80%_0%,rgba(244,214,200,0.55),transparent_55%),linear-gradient(180deg,#fffaf5,#ffffff)]">
      <ToastContainer position="bottom-right" autoClose={1500} hideProgressBar />

      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:py-10">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2">
              <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs text-black/70 backdrop-blur">
                API: {API_BASE}
              </span>
              <span className={pill}>
                <Info size={14} /> 小白向导式 / Guided
              </span>
            </div>
            <h1 className="mt-3 text-[22px] md:text-[30px] font-extrabold tracking-tight text-[#111827]">
              宝塚 ONLINE 画像探測・リンク推定ツール / 商品图探测与链接推测
            </h1>
            <p className="mt-1 text-sm md:text-base text-black/60">
              Step 1 搜索「小卡」→ Step 2 自动推测图片序列（支持多种规律：S/prefix-NNN、L/code、L/stem+suffix）
            </p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab("cards")}
              className={cls(btn, tab === "cards" ? btnPrimary : btnGhost)}
            >
              <Search size={16} /> Step 1 小卡检索
            </button>
            <button
              onClick={() => setTab("images")}
              className={cls(btn, tab === "images" ? btnPrimary : btnGhost)}
            >
              <ImageIcon size={16} /> Step 2 图片探測
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:gap-6">
          {tab === "cards" && (
            <div className={cardWrap}>
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-[#111827]">Step 1 / 小卡（コレクションカード）检索</div>
                  <div className="mt-1 text-xs text-black/60">
                    说明：先用 keyword 搜索到「小卡商品」链接，再基于小卡编码推测定妆/舞写图。
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={loadCards} className={cls(btn, btnPrimary)} disabled={cardsLoading}>
                    <Wand2 size={16} />
                    {cardsLoading ? "Searching..." : "Search / 检索"}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="block">
                  <div className="text-xs font-semibold text-black/70">Keyword（商品类型）</div>
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="例：コレクションカード"
                    className="mt-1 w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none focus:border-[#e7bcb5]"
                  />
                  <div className="mt-1 text-[11px] text-black/50">默认：コレクションカード</div>
                </label>

                <label className="block md:col-span-2">
                  <div className="text-xs font-semibold text-black/70">Title filter（作品/公演关键词，可多词）</div>
                  <input
                    value={titleFilter}
                    onChange={(e) => setTitleFilter(e.target.value)}
                    placeholder="例：Goethe 或 ゲーテ 或 花組"
                    className="mt-1 w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none focus:border-[#e7bcb5]"
                  />
                  <div className="mt-1 text-[11px] text-black/50">
                    规则：多个词以空格/逗号分隔，采用 AND（都要包含）
                  </div>
                </label>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-[#111827]">Results / 结果</div>
                  <div className="text-xs text-black/50">{cards.length} items</div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {cardsLoading && (
                    <>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-2xl border border-black/10 bg-white/50 p-4 animate-pulse">
                          <div className="h-4 w-2/3 rounded bg-black/10" />
                          <div className="mt-2 h-3 w-1/2 rounded bg-black/10" />
                          <div className="mt-3 h-9 w-28 rounded bg-black/10" />
                        </div>
                      ))}
                    </>
                  )}

                  {!cardsLoading &&
                    cards.map((c) => (
                      <div key={c.code} className="rounded-2xl border border-black/10 bg-white/70 p-4 hover:shadow-lg transition">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#111827] truncate">
                              {c.title ? c.title : "（标题未取到 / title unknown）"}
                            </div>
                            <div className="mt-1 text-xs text-black/50 truncate">Code: {c.code}</div>
                            <div className="mt-1 text-xs text-black/50 truncate">
                              URL:{" "}
                              <a className="underline" href={c.url} target="_blank" rel="noreferrer">
                                open <ExternalLink className="inline" size={12} />
                              </a>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setPickedCard(c);
                              loadImagesForCard(c);
                            }}
                            className={cls(btn, btnPrimary, "shrink-0")}
                          >
                            <ImageIcon size={16} /> 探图
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button className={cls(btn, btnGhost, "px-3 py-1.5 text-xs")} onClick={() => copy(c.url)}>
                            Copy URL
                          </button>
                          <button className={cls(btn, btnGhost, "px-3 py-1.5 text-xs")} onClick={() => copy(c.code)}>
                            Copy Code
                          </button>
                        </div>
                      </div>
                    ))}
                </div>

                {!cardsLoading && cards.length === 0 && (
                  <div className="mt-4 rounded-2xl border border-black/10 bg-white/60 p-4 text-sm text-black/60">
                    没有结果时建议：<br />
                    ① title filter 先留空试试<br />
                    ② 换关键词：如「コレクションカード」「舞台写真」「スチール写真」等（取决于要找的品类）
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "images" && (
            <div className={cardWrap}>
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-[#111827]">Step 2 / 画像探測（最多 200 张）</div>
                  <div className="mt-1 text-xs text-black/60">
                    说明：同一公演可能存在多套规律：<br />
                    • S/{`{prefix}`}-{`{NNN}`}.jpg（常见定妆/舞写）<br />
                    • L/{`{code}`}.jpg 或 L/{`{stem}`}{`{suffix}`}.jpg（特殊摄影类，如 DEAN）<br />
                    • 新人公演可能需要手动补充 prefix（例：2505114）
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => pickedCard && loadImagesForCard(pickedCard)}
                    className={cls(btn, btnPrimary)}
                    disabled={!pickedCard || imagesLoading}
                  >
                    <Wand2 size={16} />
                    {imagesLoading ? "Probing..." : "Re-probe / 重新探测"}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                <label className="block md:col-span-2">
                  <div className="text-xs font-semibold text-black/70">Selected card / 当前小卡</div>
                  <input
                    value={pickedCard?.url || ""}
                    onChange={() => {}}
                    placeholder="先在 Step 1 选择一条小卡结果"
                    className="mt-1 w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none"
                    readOnly
                  />
                  <div className="mt-1 text-[11px] text-black/50 truncate">
                    {imagesResp?.title ? `Title: ${imagesResp.title}` : "—"}
                  </div>
                </label>

                <label className="block">
                  <div className="text-xs font-semibold text-black/70">Max images</div>
                  <input
                    type="number"
                    value={maxImages}
                    min={1}
                    max={500}
                    onChange={(e) => setMaxImages(Number(e.target.value || 200))}
                    className="mt-1 w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none focus:border-[#e7bcb5]"
                  />
                  <div className="mt-1 text-[11px] text-black/50">建议 200（你要的上限）</div>
                </label>

                <label className="block">
                  <div className="text-xs font-semibold text-black/70">Start N</div>
                  <input
                    type="number"
                    value={startN}
                    min={1}
                    max={999}
                    onChange={(e) => setStartN(Number(e.target.value || 1))}
                    className="mt-1 w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none focus:border-[#e7bcb5]"
                  />
                  <div className="mt-1 text-[11px] text-black/50">S/prefix-NNN 起始号</div>
                </label>

                <label className="block md:col-span-4">
                  <div className="text-xs font-semibold text-black/70">
                    Extra prefix（新人公演等特殊情况，可填多个）
                  </div>
                  <input
                    value={extraPrefix}
                    onChange={(e) => setExtraPrefix(e.target.value)}
                    placeholder="例：2505114 （多个用空格或逗号分隔）"
                    className="mt-1 w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none focus:border-[#e7bcb5]"
                  />
                  <div className="mt-1 text-[11px] text-black/50">
                    示例：星組『阿修羅城の瞳』『エスペラント！』新人公演可尝试填 2505114
                  </div>
                </label>
              </div>

              {/* Strategy summary */}
              <div className="mt-5 rounded-2xl border border-black/10 bg-white/60 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
                  <Info size={16} /> 探测策略 / Strategy
                </div>
                <div className="mt-2 text-xs text-black/60">
                  后端会按优先级合并去重：<br />
                  ① 从商品页直接抓图片（若商品页已给图）<br />
                  ② L/{`{code}`}.jpg（单图直连）<br />
                  ③ S/{`{prefix}`}-{`{NNN}`}.jpg（序列，prefix 自动推测+可手填）<br />
                  ④ L/{`{stem}`}{`{suffix}`}.jpg（DEAN 等特殊摄影类）
                </div>

                {imagesResp?.strategy && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={pill}>direct: {imagesResp.strategy.direct_from_goods_page ?? 0}</span>
                    <span className={pill}>single L: {imagesResp.strategy.single_L_code ?? 0}</span>
                    <span className={pill}>
                      S prefix: {imagesResp.strategy.sequence_S_prefix || "—"} / {imagesResp.strategy.sequence_S_count ?? 0}
                    </span>
                    <span className={pill}>L stem seq: {imagesResp.strategy.sequence_L_stem_count ?? 0}</span>
                  </div>
                )}
              </div>

              {/* Images */}
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-[#111827]">Images / 图片</div>
                  <div className="text-xs text-black/50">
                    {imagesResp?.images?.length || 0} files
                  </div>
                </div>

                {imagesLoading && (
                  <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="aspect-[3/4] rounded-2xl border border-black/10 bg-white/50 animate-pulse" />
                    ))}
                  </div>
                )}

                {!imagesLoading && imagesResp?.images?.length ? (
                  <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
                    {imagesResp.images.map((u) => (
                      <div
                        key={u}
                        className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white/60 shadow hover:shadow-xl transition"
                      >
                        <img
                          src={u}
                          alt="img"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                          loading="lazy"
                          onClick={() => {
                            setModalSrc(u);
                            setModalOpen(true);
                          }}
                        />
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <button
                            className="rounded-lg bg-white/80 px-2 py-1 text-[11px] font-semibold text-black hover:bg-white"
                            onClick={() => copy(u)}
                          >
                            Copy
                          </button>
                          <a
                            className="rounded-lg bg-white/80 px-2 py-1 text-[11px] font-semibold text-black hover:bg-white"
                            href={u}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open <ExternalLink className="inline" size={12} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  !imagesLoading && (
                    <div className="mt-3 rounded-2xl border border-black/10 bg-white/60 p-4 text-sm text-black/60">
                      还没有图片结果时，你可以这样排查：<br />
                      ① 回到 Step 1 换一个更精确的过滤词（比如「阿修羅城」「エスペラント」「新人公演」）<br />
                      ② 在 Extra prefix 里手动补一个候选（比如 2505114）再点“重新探测”<br />
                      ③ 有些商品本身就只有 L/code.jpg（DEAN 类），这时序列不会命中，但 single L 可能命中
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        src={modalSrc}
        title={imagesResp?.title || "画像プレビュー / 图片预览"}
      />
    </div>
  );
}