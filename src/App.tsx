import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Image as ImageIcon, Link as LinkIcon, X, Loader2 } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

type CardItem = { url: string; code: string };
type CardSearchResp = { keyword: string; title_filter: string[]; results: CardItem[]; error?: string; message?: string };

type CardImagesResp = {
  card_url: string;
  code: string;
  prefix_candidates: string[];
  picked_prefix: string | null;
  images: string[];
  error?: string;
  message?: string;
};

const TABS = [
  { key: "cards", label: "スチール写真リンク推測 / 定妆・舞写 링크推测" },
  { key: "program", label: "公演プログラム / 场刊检索" },
  { key: "batch", label: "公演名一括 / 批量检索" },
] as const;

type TabKey = typeof TABS[number]["key"];

function cx(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(" ");
}

function safeJson<T = any>(x: any): T {
  return x as T;
}

export default function App() {
  const [tab, setTab] = useState<TabKey>("cards");

  // ✅ 强制你能看见现在请求的后端 base，避免“以为本地其实线上”
  const apiBase = useMemo(() => {
    // 你可改成 VITE_API_BASE；本地默认 127.0.0.1:8000
    const envBase = (import.meta as any).env?.VITE_API_BASE as string | undefined;
    return (envBase && envBase.trim()) ? envBase.trim().replace(/\/+$/, "") : "http://127.0.0.1:8000";
  }, []);

  // ============ Cards (定妆/舞写) ============
  const [keyword, setKeyword] = useState("コレクションカード");
  const [titleFilter, setTitleFilter] = useState(""); // 用户输入：例如 Goethe / ゲーテ / 花組
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [pickedCard, setPickedCard] = useState<CardItem | null>(null);

  const [imagesLoading, setImagesLoading] = useState(false);
  const [cardImages, setCardImages] = useState<CardImagesResp | null>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string>("");

  // ============ Program ============
  const [programYear, setProgramYear] = useState(2025);
  const [programQ, setProgramQ] = useState("花組");
  const [programLoading, setProgramLoading] = useState(false);
  const [programRows, setProgramRows] = useState<any[]>([]);

  // ============ Batch ============
  const [batchInput, setBatchInput] = useState("Goethe\n悪魔城ドラキュラ\nJubilee");
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResults, setBatchResults] = useState<Record<string, any[]>>({});

  async function fetchJson(url: string) {
    const r = await fetch(url, { method: "GET" });
    const t = await r.text();
    try {
      return JSON.parse(t);
    } catch {
      return { error: "invalid_json", message: t };
    }
  }

  async function runCardSearch() {
    setCardsLoading(true);
    setCards([]);
    setPickedCard(null);
    setCardImages(null);

    try {
      // ✅ title_filter 支持多词（空格分隔）；后端是“宽松 any-hit”
      const filters = titleFilter
        .split(/\s+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const params = new URLSearchParams();
      params.set("keyword", keyword);
      // 多值 query：title_filter=a&title_filter=b
      filters.forEach((f) => params.append("title_filter", f));

      const url = `${apiBase}/api/cards?${params.toString()}`;
      const data = safeJson<CardSearchResp>(await fetchJson(url));

      const arr = Array.isArray(data?.results) ? data.results : [];
      setCards(arr);

      if (data?.error) toast.error(`検索失敗: ${data.error}`);
      if (arr.length === 0) toast.info("结果为空：请尝试清空过滤词或换成 ゲーテ / 花組");
    } catch (e: any) {
      toast.error(`搜索失败：${String(e)}`);
    } finally {
      setCardsLoading(false);
    }
  }

  async function runGetImages(card: CardItem) {
    setPickedCard(card);
    setImagesLoading(true);
    setCardImages(null);

    try {
      const url = `${apiBase}/api/card_images?card_url=${encodeURIComponent(card.url)}`;
      const data = safeJson<CardImagesResp>(await fetchJson(url));
      setCardImages(data);

      if (data?.error) toast.error(`画像取得失敗: ${data.error}`);
      if ((data?.images ?? []).length === 0) toast.info("无图：可能图片尚未生成，或前缀推导失败（可稍后再试）");
      else toast.success(`取得 ${data.images.length} 张`);
    } catch (e: any) {
      toast.error(`画像取得失败：${String(e)}`);
    } finally {
      setImagesLoading(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success("コピーしました / 已复制"));
  }

  async function runProgramSearch() {
    setProgramLoading(true);
    setProgramRows([]);
    try {
      const params = new URLSearchParams();
      params.set("year", String(programYear));
      // q 支持多词：用空格拆成多个 q=
      programQ
        .split(/\s+/)
        .map((x) => x.trim())
        .filter(Boolean)
        .forEach((x) => params.append("q", x));

      const url = `${apiBase}/api/program?${params.toString()}`;
      const data = await fetchJson(url);
      const arr = Array.isArray(data?.results) ? data.results : [];
      setProgramRows(arr);
      if (arr.length === 0) toast.info("没有结果：换关键词试试（如 花組 / 雪組 / Goethe）");
    } catch (e: any) {
      toast.error(`检索失败：${String(e)}`);
    } finally {
      setProgramLoading(false);
    }
  }

  async function runBatchSearch() {
    setBatchLoading(true);
    setBatchResults({});
    try {
      const lines = batchInput
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const out: Record<string, any[]> = {};
      for (const line of lines) {
        const params = new URLSearchParams();
        params.set("year", "2025");
        line.split(/\s+/).filter(Boolean).forEach((x) => params.append("q", x));
        const url = `${apiBase}/api/program?${params.toString()}`;
        const data = await fetchJson(url);
        out[line] = Array.isArray(data?.results) ? data.results : [];
      }
      setBatchResults(out);
      toast.success("批量检索完成");
    } catch (e: any) {
      toast.error(`批量失败：${String(e)}`);
    } finally {
      setBatchLoading(false);
    }
  }

  useEffect(() => {
    // 首次提示当前 API base
    toast.info(`API Base: ${apiBase}`, { autoClose: 2500 });
  }, [apiBase]);

  return (
    <div className="min-h-screen bg-[#fffaf5]">
      <ToastContainer position="bottom-right" theme="light" />

      {/* 顶部：更像 shop.tca-pictures 的清爽白底 + 轻微渐变 */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-black/5">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="text-[18px] md:text-[20px] font-semibold tracking-tight text-[#1f2328]">
              Takarazuka Link Finder
              <span className="ml-2 text-[12px] font-normal text-[#6b7280]">宝塚 ONLINE 商品 링크 탐색</span>
            </div>
            <div className="text-[12px] text-[#6b7280] mt-0.5">
              API: <span className="font-mono">{apiBase}</span>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cx(
                  "px-3 py-2 rounded-xl text-[12px] md:text-[13px] transition",
                  tab === t.key
                    ? "bg-[#0f172a] text-white shadow"
                    : "bg-[#f7f7f7] text-[#111827] hover:bg-[#efefef]"
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* 背景纹理/渐变（不惨白） */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#fffaf5] via-white to-[#fff1f2]" />
        <div className="absolute -top-32 right-[-120px] h-[320px] w-[320px] rounded-full bg-[#f9a8d4]/25 blur-3xl" />
        <div className="absolute top-[240px] left-[-140px] h-[360px] w-[360px] rounded-full bg-[#93c5fd]/18 blur-3xl" />
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === "cards" && (
          <section className="space-y-4">
            <Card>
              <CardHeader
                title="スチール写真リンク推測 / 定妆・舞写 링크推测"
                subtitle="① 先从搜索页抓「小卡」商品链接 ② 再用小卡 code 推导图片序列（S/{prefix}-{NNN}.jpg）"
              />
              <div className="grid md:grid-cols-3 gap-3">
                <Field label="搜索关键词 / Keyword（建议默认）">
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0f172a]/20"
                    placeholder="例：コレクションカード"
                  />
                </Field>

                <Field label="作品过滤 / Title filter（可留空）">
                  <input
                    value={titleFilter}
                    onChange={(e) => setTitleFilter(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0f172a]/20"
                    placeholder="例：ゲーテ / 花組 / GOETHE（空格可多词）"
                  />
                </Field>

                <div className="flex items-end">
                  <button
                    onClick={runCardSearch}
                    className="w-full rounded-xl bg-[#0f172a] text-white px-3 py-2 text-[14px] font-medium hover:opacity-95 active:opacity-90 flex items-center justify-center gap-2 shadow"
                    disabled={cardsLoading}
                  >
                    {cardsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    検索 / 搜索
                  </button>
                </div>
              </div>

              <div className="mt-4 text-[12px] text-[#6b7280] leading-relaxed">
                <div>Tips：</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>过滤词不要堆太多；建议优先试「ゲーテ」「花組」。</li>
                  <li>若能看到小卡列表但取不到图：可能图片尚未生成，或 prefix 推导需要等官网生成后再试。</li>
                </ul>
              </div>
            </Card>

            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader title="小卡结果 / Card results" subtitle={`共 ${cards.length} 件`} />
                <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
                  {cardsLoading && <SkeletonList />}

                  {!cardsLoading && cards.length === 0 && (
                    <Empty>
                      没有结果。你刚才贴的接口明明有 results 的话，说明前端请求的 API base 可能不是本地。
                      <div className="mt-2 text-[12px] text-[#6b7280]">
                        现在 UI 显示的 API base 是：<span className="font-mono">{apiBase}</span>
                      </div>
                    </Empty>
                  )}

                  {!cardsLoading &&
                    cards.map((c) => (
                      <div key={c.url} className="rounded-2xl border border-black/10 bg-white p-3 hover:shadow-sm transition">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[13px] text-[#111827] font-medium truncate">{c.code}</div>
                            <div className="text-[12px] text-[#6b7280] break-all mt-1">{c.url}</div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              className="rounded-xl px-3 py-2 text-[12px] bg-[#f7f7f7] hover:bg-[#efefef] border border-black/5 flex items-center gap-1"
                              onClick={() => copy(c.url)}
                            >
                              <LinkIcon className="h-4 w-4" /> URL
                            </button>
                            <button
                              className="rounded-xl px-3 py-2 text-[12px] bg-[#0f172a] text-white hover:opacity-95 flex items-center gap-1"
                              onClick={() => runGetImages(c)}
                            >
                              <ImageIcon className="h-4 w-4" /> 画像
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>

              <Card>
                <CardHeader
                  title="画像 / Images"
                  subtitle={
                    pickedCard
                      ? `选中：${pickedCard.code}`
                      : "先在左侧点「画像」取得图片序列"
                  }
                />

                {imagesLoading && (
                  <div className="flex items-center gap-2 text-[13px] text-[#6b7280]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    探测图片中…（可能需要几秒）
                  </div>
                )}

                {!imagesLoading && !cardImages && <Empty>暂无图片。点击左侧某条的「画像」开始提取。</Empty>}

                {!imagesLoading && cardImages && (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-black/10 bg-white p-3">
                      <div className="text-[12px] text-[#6b7280]">
                        picked_prefix：
                        <span className="ml-2 font-mono text-[#111827]">{String(cardImages.picked_prefix)}</span>
                      </div>
                      <div className="text-[12px] text-[#6b7280] mt-1">
                        candidates：
                        <span className="ml-2 font-mono">{(cardImages.prefix_candidates || []).join(", ") || "-"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {(cardImages.images || []).map((img) => (
                        <button
                          key={img}
                          className="group rounded-2xl overflow-hidden border border-black/10 bg-white hover:shadow-md transition"
                          onClick={() => {
                            setLightboxUrl(img);
                            setLightboxOpen(true);
                          }}
                          title="点击放大 / Zoom"
                        >
                          <img src={img} alt="" className="w-full h-[96px] object-cover group-hover:scale-[1.03] transition" />
                        </button>
                      ))}
                    </div>

                    {(cardImages.images || []).length > 0 && (
                      <div className="text-[12px] text-[#6b7280]">
                        点击缩略图放大；点击 URL 可复制。
                        <div className="mt-2 space-y-1 max-h-[160px] overflow-auto rounded-2xl border border-black/10 bg-white p-3">
                          {(cardImages.images || []).map((u) => (
                            <div key={u} className="flex items-center justify-between gap-2">
                              <div className="text-[12px] break-all">{u}</div>
                              <button
                                className="shrink-0 text-[12px] px-2 py-1 rounded-lg bg-[#f7f7f7] hover:bg-[#efefef]"
                                onClick={() => copy(u)}
                              >
                                Copy
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </section>
        )}

        {tab === "program" && (
          <section className="space-y-4">
            <Card>
              <CardHeader
                title="公演プログラム / 场刊检索"
                subtitle="输入关键词（支持空格多词 AND），返回标题 + URL（不展示价格/发售日等字段）"
              />
              <div className="grid md:grid-cols-3 gap-3">
                <Field label="年份 / Year">
                  <input
                    type="number"
                    value={programYear}
                    onChange={(e) => setProgramYear(Number(e.target.value || 2025))}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-[14px]"
                  />
                </Field>

                <Field label="关键词 / Keywords（空格多词）">
                  <input
                    value={programQ}
                    onChange={(e) => setProgramQ(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-[14px]"
                    placeholder="例：花組 Goethe"
                  />
                </Field>

                <div className="flex items-end">
                  <button
                    onClick={runProgramSearch}
                    className="w-full rounded-xl bg-[#0f172a] text-white px-3 py-2 text-[14px] font-medium hover:opacity-95 flex items-center justify-center gap-2"
                    disabled={programLoading}
                  >
                    {programLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    検索 / 搜索
                  </button>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title="结果 / Results" subtitle={`共 ${programRows.length} 条`} />
              <div className="space-y-2">
                {programLoading && <SkeletonList />}

                {!programLoading && programRows.length === 0 && <Empty>暂无结果。</Empty>}

                {!programLoading &&
                  programRows.map((r, idx) => (
                    <div key={idx} className="rounded-2xl border border-black/10 bg-white p-3 hover:shadow-sm transition">
                      <div className="text-[14px] font-medium text-[#111827]">{r.title || r.name || "Untitled"}</div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="text-[12px] text-[#6b7280] break-all">{r.url}</div>
                        <button
                          className="shrink-0 rounded-xl px-3 py-2 text-[12px] bg-[#f7f7f7] hover:bg-[#efefef]"
                          onClick={() => copy(r.url)}
                        >
                          Copy URL
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          </section>
        )}

        {tab === "batch" && (
          <section className="space-y-4">
            <Card>
              <CardHeader
                title="公演名一括 / 批量检索"
                subtitle="每行一个公演名（或关键词组合），自动对 /api/program 批量查询（可用于你后续扩展到更多类目）"
              />
              <textarea
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
                className="w-full min-h-[140px] rounded-2xl border border-black/10 bg-white p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0f172a]/15"
              />
              <div className="mt-3">
                <button
                  onClick={runBatchSearch}
                  className="rounded-xl bg-[#0f172a] text-white px-4 py-2 text-[14px] font-medium hover:opacity-95 inline-flex items-center gap-2"
                  disabled={batchLoading}
                >
                  {batchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  実行 / 执行
                </button>
              </div>
            </Card>

            <div className="space-y-3">
              {batchLoading && <SkeletonList />}

              {!batchLoading &&
                Object.entries(batchResults).map(([k, arr]) => (
                  <Card key={k}>
                    <CardHeader title={k} subtitle={`命中 ${arr.length} 条`} />
                    {arr.length === 0 ? (
                      <Empty>无结果</Empty>
                    ) : (
                      <div className="space-y-2">
                        {arr.map((r: any, idx: number) => (
                          <div key={idx} className="rounded-2xl border border-black/10 bg-white p-3">
                            <div className="text-[14px] font-medium text-[#111827]">{r.title || "Untitled"}</div>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div className="text-[12px] text-[#6b7280] break-all">{r.url}</div>
                              <button
                                className="shrink-0 rounded-xl px-3 py-2 text-[12px] bg-[#f7f7f7] hover:bg-[#efefef]"
                                onClick={() => copy(r.url)}
                              >
                                Copy URL
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
            </div>
          </section>
        )}
      </main>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxOpen(false)}
          >
            <motion.div
              className="relative w-full max-w-4xl rounded-3xl overflow-hidden bg-white shadow-2xl"
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setLightboxOpen(false)}
                className="absolute top-3 right-3 rounded-xl bg-black/70 text-white p-2 hover:bg-black/80"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="p-3 border-b border-black/10 flex items-center justify-between gap-2">
                <div className="text-[12px] text-[#6b7280] break-all pr-3">{lightboxUrl}</div>
                <button
                  className="shrink-0 rounded-xl px-3 py-2 text-[12px] bg-[#f7f7f7] hover:bg-[#efefef]"
                  onClick={() => copy(lightboxUrl)}
                >
                  Copy
                </button>
              </div>

              <div className="bg-[#0b1020]">
                <img src={lightboxUrl} alt="" className="w-full max-h-[78vh] object-contain" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="py-6">
        <div className="mx-auto max-w-6xl px-4 text-[12px] text-[#6b7280]">
          © Takarazuka Link Finder — local tool for link discovery & image probing.
        </div>
      </footer>
    </div>
  );
}

function Card({ children }: React.PropsWithChildren) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white/70 backdrop-blur shadow-[0_12px_30px_rgba(17,24,39,0.08)] p-4 md:p-5">
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <div className="text-[16px] md:text-[18px] font-semibold text-[#111827] tracking-tight">{title}</div>
      {subtitle && <div className="mt-1 text-[12px] md:text-[13px] text-[#6b7280] leading-relaxed">{subtitle}</div>}
    </div>
  );
}

function Field({ label, children }: React.PropsWithChildren<{ label: string }>) {
  return (
    <div className="space-y-1">
      <div className="text-[12px] text-[#6b7280]">{label}</div>
      {children}
    </div>
  );
}

function Empty({ children }: React.PropsWithChildren) {
  return (
    <div className="rounded-2xl border border-dashed border-black/10 bg-white p-4 text-[13px] text-[#6b7280]">
      {children}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-black/10 bg-white p-3">
          <div className="h-4 w-1/3 bg-black/10 rounded mb-2" />
          <div className="h-3 w-full bg-black/10 rounded" />
        </div>
      ))}
    </div>
  );
}
