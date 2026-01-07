import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Image as ImageIcon, ExternalLink, X, ClipboardCopy, Sparkles } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

type Troupe = { jp: string; cn: string; emoji: string; color: string };
type CardItem = { url: string; code: string; title?: string; date?: string | null; troupe?: Troupe | null };
type CardsResp = { keyword: string; title_filter: string[]; results: CardItem[]; error?: string; message?: string };

type PrefixSeq = { prefix: string; delta_days?: number | null; date?: string | null; start_n?: number; count: number; images: string[] };

type ImagesResp = {
  card_url: string;
  title?: string;
  code: string;
  base_date?: string | null;
  troupe?: Troupe | null;
  groups: {
    card_images?: { count: number; images: string[] };
    main_stills?: { prefixes: PrefixSeq[] };
    rookie_stills?: { prefixes: PrefixSeq[] };
    unknown_prefix_stills?: { prefixes: PrefixSeq[] };
  };
  error?: string;
  message?: string;
  debug?: any;
};

const API_BASE = (import.meta as any).env?.VITE_API_BASE || "http://127.0.0.1:8000";

const cls = (...a: Array<string | false | undefined | null>) => a.filter(Boolean).join(" ");
const cardWrap = "rounded-2xl border border-black/10 bg-white/75 shadow-[0_18px_60px_rgba(15,23,42,0.10)] backdrop-blur p-4 md:p-5";
const btn = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-[0.99]";
const btnPrimary =
  "bg-gradient-to-r from-[#f7d7da] via-[#fff] to-[#f4d6c8] text-[#111827] border border-[#e7bcb5]/60 shadow-[0_10px_30px_rgba(231,188,181,0.25)] hover:shadow-[0_12px_36px_rgba(231,188,181,0.35)]";
const btnGhost = "bg-white/70 border border-black/10 text-[#111827] hover:bg-white/90";

function Modal({ open, onClose, src, title }: { open: boolean; onClose: () => void; src: string; title?: string }) {
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
            className="relative w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl"
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
                <X size={16} /> 閉じる / 关闭
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

function TroupeBadge({ troupe }: { troupe?: Troupe | null }) {
  if (!troupe) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/80 px-2.5 py-1 text-xs font-semibold"
      style={{ color: troupe.color }}
      title={`${troupe.jp}/${troupe.cn}`}
    >
      <span>{troupe.emoji}</span>
      <span>{troupe.jp}</span>
      <span className="text-black/40">/</span>
      <span className="text-black/60">{troupe.cn}</span>
    </span>
  );
}

function Section({
  title,
  hint,
  images,
  onOpen,
  onCopy,
}: {
  title: string;
  hint?: string;
  images: string[];
  onOpen: (u: string) => void;
  onCopy: (u: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-[#111827]">{title}</div>
          {hint && <div className="mt-1 text-xs text-black/55">{hint}</div>}
        </div>
        <div className="text-xs text-black/50">{images.length} 枚</div>
      </div>

      {images.length === 0 ? (
        <div className="mt-3 text-sm text-black/50">暂无 / なし</div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          {images.map((u) => (
            <div key={u} className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white/60 hover:shadow-xl transition">
              <img
                src={u}
                alt="img"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                loading="lazy"
                onClick={() => onOpen(u)}
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/60 to-transparent p-2">
                <button className="rounded-lg bg-white/80 px-2 py-1 text-[11px] font-semibold text-black hover:bg-white" onClick={() => onCopy(u)}>
                  复制 / コピー
                </button>
                <a className="rounded-lg bg-white/80 px-2 py-1 text-[11px] font-semibold text-black hover:bg-white" href={u} target="_blank" rel="noreferrer">
                  打开 / 開く
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PrefixSection({
  title,
  blocks,
  onOpen,
  onCopy,
}: {
  title: string;
  blocks: PrefixSeq[];
  onOpen: (u: string) => void;
  onCopy: (u: string) => void;
}) {
  const total = blocks.reduce((a, b) => a + (b.images?.length || 0), 0);

  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-4">
      <div className="flex items-end justify-between gap-2">
        <div className="text-sm font-semibold text-[#111827]">{title}</div>
        <div className="text-xs text-black/50">{total} 枚</div>
      </div>

      {blocks.length === 0 ? (
        <div className="mt-3 text-sm text-black/50">暂无 / なし</div>
      ) : (
        <div className="mt-3 space-y-4">
          {blocks.map((b) => (
            <div key={b.prefix} className="rounded-2xl border border-black/10 bg-white/70 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold text-black/70">
                  prefix: {b.prefix}
                  {typeof b.start_n === "number" && <span className="ml-2 text-black/50">（从 {String(b.start_n).padStart(3, "0")} 开始）</span>}
                  {typeof b.delta_days === "number" && <span className="ml-2 text-black/50">（基准+{b.delta_days}日）</span>}
                </div>
                <div className="text-xs text-black/50">{b.images.length} 枚</div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
                {b.images.map((u) => (
                  <div key={u} className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white/60 hover:shadow-xl transition">
                    <img
                      src={u}
                      alt="img"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                      loading="lazy"
                      onClick={() => onOpen(u)}
                    />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <button className="rounded-lg bg-white/80 px-2 py-1 text-[11px] font-semibold text-black hover:bg-white" onClick={() => onCopy(u)}>
                        复制 / コピー
                      </button>
                      <a className="rounded-lg bg-white/80 px-2 py-1 text-[11px] font-semibold text-black hover:bg-white" href={u} target="_blank" rel="noreferrer">
                        打开 / 開く
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [keyword, setKeyword] = useState("コレクションカード");
  const [titleFilter, setTitleFilter] = useState("");
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cards, setCards] = useState<CardItem[]>([]);

  const [maxImages, setMaxImages] = useState(200);
  const [extraPrefix, setExtraPrefix] = useState("");
  const [probing, setProbing] = useState(false);
  const [picked, setPicked] = useState<CardItem | null>(null);
  const [imagesResp, setImagesResp] = useState<ImagesResp | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalSrc, setModalSrc] = useState("");

  const resultsRef = useRef<HTMLDivElement | null>(null);

  const titleFiltersArr = useMemo(
    () => titleFilter.split(/[,\s]+/g).map((x) => x.trim()).filter(Boolean),
    [titleFilter]
  );
  const extraPrefixArr = useMemo(
    () => extraPrefix.split(/[,\s]+/g).map((x) => x.trim()).filter(Boolean),
    [extraPrefix]
  );

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("コピーしました！/ 已复制");
  }

  async function loadCards() {
    setCardsLoading(true);
    setCards([]);
    setPicked(null);
    setImagesResp(null);

    try {
      const u = new URL(`${API_BASE}/api/cards`);
      u.searchParams.set("keyword", keyword);
      u.searchParams.set("page_size", "120");
      for (const f of titleFiltersArr) u.searchParams.append("title_filter", f);

      const r = await fetch(u.toString());
      const j = (await r.json()) as CardsResp;
      setCards(j.results || []);
      if ((j.results || []).length === 0) toast.info("结果为空：建议清空“作品过滤”再试 / フィルター空で再試");
      else toast.success(`小卡：${j.results.length} 件`);
    } catch (e: any) {
      toast.error(`检索失败 / 検索失敗：${e?.message || e}`);
    } finally {
      setCardsLoading(false);
    }
  }

  async function probe(card: CardItem) {
    setPicked(card);
    setProbing(true);
    setImagesResp(null);

    try {
      const u = new URL(`${API_BASE}/api/card_images`);
      u.searchParams.set("card_url", card.url);
      u.searchParams.set("max_images", String(maxImages));
      for (const p of extraPrefixArr) u.searchParams.append("extra_prefix", p);

      const r = await fetch(u.toString());
      const j = (await r.json()) as ImagesResp;
      setImagesResp(j);

      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

      const total =
        (j.groups?.card_images?.images?.length || 0) +
        (j.groups?.main_stills?.prefixes || []).reduce((a, x) => a + (x.images?.length || 0), 0) +
        (j.groups?.rookie_stills?.prefixes || []).reduce((a, x) => a + (x.images?.length || 0), 0) +
        (j.groups?.unknown_prefix_stills?.prefixes || []).reduce((a, x) => a + (x.images?.length || 0), 0);

      if (total === 0) toast.warning("没有探测到图片：可尝试手动补 prefix 再点一次 / prefix追加入力で再試");
      else toast.success(`画像：${total} 枚`);
    } catch (e: any) {
      toast.error(`探图失败 / 探図失敗：${e?.message || e}`);
    } finally {
      setProbing(false);
    }
  }

  useEffect(() => {
    toast.info("先点「检索」拿到小卡列表，再点「探图」 / まず検索→次に探図");
  }, []);

  const cardImgs = imagesResp?.groups?.card_images?.images || [];
  const mainBlocks = imagesResp?.groups?.main_stills?.prefixes || [];
  const rookieBlocks = imagesResp?.groups?.rookie_stills?.prefixes || [];
  const unknownBlocks = imagesResp?.groups?.unknown_prefix_stills?.prefixes || [];

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_700px_at_20%_-10%,rgba(247,215,218,0.65),transparent_60%),radial-gradient(1000px_600px_at_80%_0%,rgba(244,214,200,0.55),transparent_55%),linear-gradient(180deg,#fffaf5,#ffffff)]">
      <ToastContainer position="bottom-right" autoClose={1500} hideProgressBar />

      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:py-10">
        <div className="rounded-2xl border border-black/10 bg-white/70 p-4 md:p-5">
          <div className="text-xs text-black/55">API: {API_BASE}</div>
          <h1 className="mt-1 text-[22px] md:text-[30px] font-extrabold tracking-tight text-[#111827]">
            宝塚 ONLINE 画像探測ツール / 商品图探测工具
          </h1>
          <p className="mt-1 text-sm md:text-base text-black/60">
            ① 小卡を検索（コレクションカード）→ ② 探图（定妆・舞写・新人公演も自動探索）→ ③ 画像クリックで拡大
            <br />
            ① 搜小卡 → ② 点“探图”（自动找定妆/舞写/新人公演）→ ③ 点击图片放大
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs text-black/70">
            <Sparkles size={14} /> 组别识别已修复：按标题里的「花月雪星宙」优先识别
          </div>
        </div>

        <div className={cls(cardWrap, "mt-5")}>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm font-semibold text-[#111827]">STEP 1：小卡检索 / 小卡検索</div>
              <div className="mt-1 text-xs text-black/60">
                不敏感就这么用：关键词保持「コレクションカード」，作品过滤先留空，点检索。
              </div>
            </div>
            <button onClick={loadCards} className={cls(btn, btnPrimary)} disabled={cardsLoading}>
              <Search size={16} />
              {cardsLoading ? "检索中… / 検索中…" : "检索 / 検索"}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block">
              <div className="text-xs font-semibold text-black/70">Keyword（商品类别 / 種類）</div>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm outline-none focus:border-[#e7bcb5]"
                placeholder="例：コレクションカード"
              />
            </label>

            <label className="block md:col-span-2">
              <div className="text-xs font-semibold text-black/70">作品过滤（可空 / 空でもOK）</div>
              <input
                value={titleFilter}
                onChange={(e) => setTitleFilter(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm outline-none focus:border-[#e7bcb5]"
                placeholder="例：Goethe / 侍タイムスリッパー / 阿修羅城"
              />
              <div className="mt-1 text-[11px] text-black/50">多个词用空格/逗号分隔（AND）。不会用就留空。</div>
            </label>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block">
              <div className="text-xs font-semibold text-black/70">画像上限 / 上限</div>
              <input
                type="number"
                value={maxImages}
                min={1}
                max={400}
                onChange={(e) => setMaxImages(Number(e.target.value || 200))}
                className="mt-1 w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm outline-none focus:border-[#e7bcb5]"
              />
              <div className="mt-1 text-[11px] text-black/50">推荐 200</div>
            </label>

            <label className="block md:col-span-2">
              <div className="text-xs font-semibold text-black/70">手动补 prefix（可空 / 空でもOK）</div>
              <input
                value={extraPrefix}
                onChange={(e) => setExtraPrefix(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm outline-none focus:border-[#e7bcb5]"
                placeholder="例：2505114,2506024（新人公演/东宝等）"
              />
              <div className="mt-1 text-[11px] text-black/50">
                系统会自动扩展候选 prefix；只有“新人公演图没出来”时再手动填你已知的 prefix。
              </div>
            </label>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Left */}
          <div className={cardWrap}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[#111827]">小卡时间轴 / タイムライン</div>
              <div className="text-xs text-black/50">{cards.length} 件</div>
            </div>

            {cardsLoading && (
              <div className="mt-3 space-y-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-black/10 bg-white/60 p-4 animate-pulse">
                    <div className="h-4 w-2/3 rounded bg-black/10" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-black/10" />
                  </div>
                ))}
              </div>
            )}

            {!cardsLoading && cards.length === 0 && (
              <div className="mt-4 rounded-2xl border border-black/10 bg-white/60 p-4 text-sm text-black/60">
                还没有结果：先点上方“检索”。如果仍为空：把“作品过滤”清空再试。
              </div>
            )}

            {!cardsLoading && cards.length > 0 && (
              <div className="mt-3">
                <div className="relative pl-5">
                  <div className="absolute left-2 top-2 bottom-2 w-[2px] bg-gradient-to-b from-black/10 via-black/10 to-transparent" />
                  <div className="space-y-3">
                    {cards.map((c) => {
                      const troupe = c.troupe || null;
                      const isPicked = picked?.code === c.code;
                      return (
                        <div
                          key={c.code}
                          className={cls(
                            "relative rounded-2xl border bg-white/75 p-4 transition",
                            isPicked ? "border-[#e7bcb5] shadow-lg" : "border-black/10 hover:shadow-md"
                          )}
                        >
                          <div
                            className="absolute -left-[3px] top-5 h-3 w-3 rounded-full border border-white shadow"
                            style={{ background: troupe?.color || "#cbd5e1" }}
                          />
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <TroupeBadge troupe={troupe} />
                                {c.date && <span className="text-xs font-semibold text-black/60">{c.date}</span>}
                              </div>
                              <div className="mt-2 text-sm font-semibold text-[#111827] truncate">{c.title || "（标题未取到）"}</div>
                              <div className="mt-1 text-xs text-black/50 truncate">code: {c.code}</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button className={cls(btn, btnGhost, "px-3 py-1.5 text-xs")} onClick={() => copy(c.url)}>
                                  <ClipboardCopy size={14} /> URL
                                </button>
                                <a className={cls(btn, btnGhost, "px-3 py-1.5 text-xs")} href={c.url} target="_blank" rel="noreferrer">
                                  <ExternalLink size={14} /> 開く / 打开
                                </a>
                              </div>
                            </div>

                            <button className={cls(btn, btnPrimary, "shrink-0")} onClick={() => probe(c)} disabled={probing}>
                              <ImageIcon size={16} />
                              {probing && isPicked ? "探图中…" : "探图"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right */}
          <div className={cardWrap}>
            <div ref={resultsRef} className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[#111827]">探图结果 / 探図結果</div>
              <div className="text-xs text-black/50">{picked ? "已选择 / 選択済み" : "未选择 / 未選択"}</div>
            </div>

            {!picked && (
              <div className="mt-4 rounded-2xl border border-black/10 bg-white/60 p-4 text-sm text-black/60">
                左侧时间轴里点“探图”即可。<br />左のタイムラインで「探図」を押してください。
              </div>
            )}

            {picked && probing && (
              <div className="mt-4 rounded-2xl border border-black/10 bg-white/60 p-4">
                <div className="text-sm font-semibold text-[#111827]">正在探测中… / 探索中…</div>
                <div className="mt-2 text-xs text-black/60">
                  已修复：会尝试多起点（001..030）+ HEAD 不通自动 GET 探测，因此“只有小卡图”的问题应明显改善。
                </div>
              </div>
            )}

            {picked && !probing && imagesResp && (
              <div className="mt-4 space-y-5">
                <div className="rounded-2xl border border-black/10 bg-white/70 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <TroupeBadge troupe={imagesResp.troupe || null} />
                    {imagesResp.base_date && <span className="text-xs font-semibold text-black/60">基准日：{imagesResp.base_date}</span>}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-[#111827]">{imagesResp.title || "（标题未取到）"}</div>
                  <div className="mt-1 text-xs text-black/50 break-all">{imagesResp.card_url}</div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-white/60 p-4 text-sm text-black/60">
                  图片规律（记三条就够）：<br />
                  1）宝大定妆・舞写：<b>/img/goods/S/{`{prefix}`}-{`{NNN}`}.jpg</b>（系统会自动找起始 NNN）<br />
                  2）特殊定妆・舞写：<b>/img/goods/L/{`{code}`}.jpg</b>（系统自动尝试）<br />
                  3）新人公演/东宝：可能换 prefix（如 2505114），系统已自动扩展候选；仍缺就手动补 prefix 再试。
                </div>

                <Section
                  title="小卡画像 / 小卡画像"
                  hint="商品页直接能拿到的图片（S/L都可能）"
                  images={cardImgs}
                  onOpen={(u) => {
                    setModalSrc(u);
                    setModalOpen(true);
                  }}
                  onCopy={copy}
                />

                <PrefixSection
                  title="定妆・舞写 / 定妆・舞写"
                  blocks={imagesResp.groups?.main_stills?.prefixes || []}
                  onOpen={(u) => {
                    setModalSrc(u);
                    setModalOpen(true);
                  }}
                  onCopy={copy}
                />

                <PrefixSection
                  title="新人公演・东宝（候补）/ 新人公演・東宝（候補）"
                  blocks={imagesResp.groups?.rookie_stills?.prefixes || []}
                  onOpen={(u) => {
                    setModalSrc(u);
                    setModalOpen(true);
                  }}
                  onCopy={copy}
                />

                {(imagesResp.groups?.unknown_prefix_stills?.prefixes || []).length > 0 && (
                  <PrefixSection
                    title="手动 prefix 命中 / 手動prefixヒット"
                    blocks={imagesResp.groups?.unknown_prefix_stills?.prefixes || []}
                    onOpen={(u) => {
                      setModalSrc(u);
                      setModalOpen(true);
                    }}
                    onCopy={copy}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} src={modalSrc} title={imagesResp?.title} />
    </div>
  );
}
