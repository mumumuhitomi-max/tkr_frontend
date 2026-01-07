import React, { useMemo, useState } from "react";
import { Search, Image as ImageIcon, ExternalLink, Loader2, X, Copy } from "lucide-react";
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
  troupe_digit?: string;
  prefix_groups?: Record<string, string[]>;
  error?: string;
  message?: string;
};

const API_BASE = (import.meta as any).env?.VITE_API_BASE || "http://127.0.0.1:8000";

function cx(...arr: (string | false | undefined | null)[]) {
  return arr.filter(Boolean).join(" ");
}

function copy(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success("已复制 / コピーしました"),
    () => toast.error("复制失败 / コピー失敗")
  );
}

const Shell: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="min-h-screen bg-[radial-gradient(1200px_circle_at_10%_0%,rgba(255,241,242,0.95),transparent_55%),radial-gradient(1000px_circle_at_90%_10%,rgba(255,250,245,1),transparent_52%),linear-gradient(180deg,#ffffff 0%,#fffaf5 45%,#ffffff 100%)]">
    {children}
  </div>
);

const TopBar: React.FC = () => (
  <div className="mx-auto max-w-6xl px-5 pt-8 pb-4">
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="text-[22px] md:text-[28px] font-extrabold tracking-tight text-[#111827]">
          宝塚 ONLINE 商品リンク探測
        </div>
        <div className="text-[12px] md:text-[13px] text-[#6b7280]">
          中文 / 日本語｜小卡（コレクションカード）检索 → 一键探图（定妆・舞写・新人公演 等）
        </div>
      </div>
      <div className="rounded-2xl border border-black/10 bg-white/70 backdrop-blur-md px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <div className="text-[12px] text-[#6b7280]">
          API Base：<span className="font-mono text-[#111827]">{API_BASE}</span>
        </div>
      </div>
    </div>
  </div>
);

const Card: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className, children }) => (
  <div
    className={cx(
      "rounded-2xl border border-black/10 bg-white/70 backdrop-blur-md",
      "shadow-[0_10px_30px_rgba(15,23,42,0.08)]",
      className
    )}
  >
    {children}
  </div>
);

const Input: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder }) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={cx(
      "w-full rounded-xl border border-black/10 bg-white/90 px-4 py-3 text-[14px] outline-none",
      "focus:border-[#e7bcb5] focus:ring-2 focus:ring-[#f5d6d2]"
    )}
  />
);

const PrimaryBtn: React.FC<
  React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean; className?: string }>
> = ({ onClick, disabled, className, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cx(
      "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-semibold",
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
      "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-semibold",
      "bg-white text-[#111827] border border-black/10",
      "hover:bg-[#fff7f8] hover:border-[#e7bcb5] hover:shadow-[0_10px_24px_rgba(231,188,181,0.25)] hover:scale-[1.01] active:scale-[0.99] transition",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
      className
    )}
  >
    {children}
  </button>
);

const Modal: React.FC<{ open: boolean; img: string; onClose: () => void }> = ({ open, img, onClose }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/45" onClick={onClose} />
        <motion.div
          className="relative z-10 w-[min(1100px,94vw)] max-h-[86vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-black/10"
          initial={{ y: 16, scale: 0.98, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 16, scale: 0.98, opacity: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 bg-gradient-to-r from-[#fffaf5] via-white to-[#fff1f2]">
            <div className="text-[15px] font-semibold text-[#111827]">画像プレビュー / 图片预览</div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/5 transition" aria-label="close">
              <X size={18} />
            </button>
          </div>
          <div className="p-5 overflow-auto max-h-[calc(86vh-64px)]">
            <img src={img} className="w-full rounded-2xl border border-black/10" />
            <div className="mt-3 flex flex-wrap gap-2">
              <SoftBtn onClick={() => copy(img)}>
                <Copy size={16} /> 复制链接 / コピー
              </SoftBtn>
              <a href={img} target="_blank" rel="noreferrer">
                <PrimaryBtn>新标签打开 / 開く</PrimaryBtn>
              </a>
            </div>
            <div className="mt-2 text-[12px] text-[#6b7280] font-mono break-all">{img}</div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default function App() {
  const [keyword, setKeyword] = useState("コレクションカード");
  const [filter, setFilter] = useState(""); // optional: Goethe / ゲーテ / 花組
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>("");

  const [imagesLoadingCode, setImagesLoadingCode] = useState<string>("");
  const [imagesResp, setImagesResp] = useState<ImagesResp | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImg, setModalImg] = useState("");

  const filterTokens = useMemo(
    () => filter.split(/\s+/).map((s) => s.trim()).filter(Boolean),
    [filter]
  );

  async function fetchCards() {
    setCardsLoading(true);
    setCards([]);
    setImagesResp(null);
    setSelectedCode("");
    try {
      const params = new URLSearchParams();
      params.set("keyword", keyword.trim() || "コレクションカード");
      filterTokens.forEach((t) => params.append("title_filter", t));
      params.set("max_pages", "10");
      params.set("timeout", "15");
      const r = await fetch(`${API_BASE}/api/cards?${params.toString()}`);
      const j = await r.json();
      const list = (j?.results || []) as CardItem[];

      // ✅ 再保险：前端也按 code 倒序（最新在上）
      list.sort((a, b) => (b.code || "").localeCompare(a.code || ""));
      setCards(list);

      if (!list.length) toast.info("无结果 / 該当なし");
    } catch (e: any) {
      toast.error(`检索失败 / 検索失敗：${String(e)}`);
    } finally {
      setCardsLoading(false);
    }
  }

  async function probeCard(card: CardItem) {
    setSelectedCode(card.code);
    setImagesResp(null);
    setImagesLoadingCode(card.code);
    try {
      const params = new URLSearchParams();
      params.set("card_url", card.url);
      params.set("max_images", "200");
      params.set("dd_scan_max", "20");
      params.set("timeout", "15");
      const r = await fetch(`${API_BASE}/api/images?${params.toString()}`);
      const j = (await r.json()) as ImagesResp;
      setImagesResp(j);
      if (j?.error) toast.error(`探图失败 / 探索失敗：${j.message || j.error}`);
      else toast.success("探图完成 / 取得完了");
    } catch (e: any) {
      toast.error(`探图失败 / 探索失敗：${String(e)}`);
    } finally {
      setImagesLoadingCode("");
    }
  }

  const flatImages = useMemo(() => {
    if (!imagesResp || imagesResp.error) return [];
    const out: { group: string; url: string }[] = [];
    if (imagesResp.card_image) out.push({ group: "小卡 / カード", url: imagesResp.card_image });
    (imagesResp.special_images || []).forEach((u) => out.push({ group: "特殊画像 / 特殊", url: u }));
    const pg = imagesResp.prefix_groups || {};
    Object.keys(pg).forEach((p) => pg[p].forEach((u) => out.push({ group: `Prefix ${p}（舞写/定妆）`, url: u })));
    return out;
  }, [imagesResp]);

  return (
    <Shell>
      <ToastContainer position="bottom-right" autoClose={1800} hideProgressBar theme="light" />
      <TopBar />

      <div className="mx-auto max-w-6xl px-5 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
          {/* LEFT: Cards + Search */}
          <Card className="p-5">
            <div className="text-[16px] font-semibold text-[#111827]">小卡检索 / カード検索</div>
            <div className="mt-2 text-[13px] text-[#374151] leading-relaxed">
              1）输入关键词（默认：コレクションカード）<br />
              2）可选填作品过滤（Goethe / ゲーテ / 花組 等）<br />
              3）点击检索后，结果按“最新 → 最旧”向下排列；每条结果可“一键探图”
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="text-[12px] text-[#6b7280] mb-1">关键词 / キーワード</div>
                <Input value={keyword} onChange={setKeyword} placeholder="コレクションカード" />
              </div>
              <div>
                <div className="text-[12px] text-[#6b7280] mb-1">作品过滤 / 作品フィルター（可留空，空格分词）</div>
                <Input value={filter} onChange={setFilter} placeholder="例：Goethe 花組 / ゲーテ 花組" />
              </div>

              <div className="flex gap-2">
                <PrimaryBtn onClick={fetchCards} disabled={cardsLoading}>
                  {cardsLoading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                  检索 / 検索
                </PrimaryBtn>
                <SoftBtn
                  onClick={() => {
                    setCards([]);
                    setImagesResp(null);
                    setSelectedCode("");
                    toast.info("已清空 / クリア");
                  }}
                >
                  清空 / クリア
                </SoftBtn>
              </div>
            </div>

            <div className="mt-5 border-t border-black/10 pt-4">
              <div className="flex items-center justify-between">
                <div className="text-[14px] font-semibold text-[#111827]">结果 / 結果</div>
                <div className="text-[12px] text-[#6b7280]">{cards.length ? `${cards.length} 件` : "—"}</div>
              </div>

              <div className="mt-3 space-y-2 max-h-[520px] overflow-auto pr-1">
                {cards.map((c) => {
                  const active = selectedCode === c.code;
                  const loadingThis = imagesLoadingCode === c.code;
                  return (
                    <div
                      key={c.code}
                      className={cx(
                        "rounded-2xl border p-4 transition",
                        active
                          ? "border-[#e7bcb5] bg-[#fff1f2]/40 shadow-[0_10px_24px_rgba(231,188,181,0.20)]"
                          : "border-black/10 bg-white/70 hover:border-[#e7bcb5]"
                      )}
                    >
                      <div className="text-[12px] text-[#6b7280] font-mono">{c.code}</div>
                      <div className="mt-1 text-[14px] font-semibold text-[#111827] line-clamp-2">
                        {c.title && c.title.trim() ? c.title : "（标题未取回 / タイトル未取得）"}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#111827] hover:underline"
                        >
                          商品页 / 商品ページ <ExternalLink size={14} />
                        </a>
                        <button
                          className="inline-flex items-center gap-1 text-[12px] text-[#6b7280] hover:text-[#111827] underline underline-offset-4"
                          onClick={() => copy(c.url)}
                        >
                          <Copy size={14} /> 复制链接
                        </button>

                        {/* ✅ 一键探图：按钮直接触发探图 */}
                        <PrimaryBtn
                          className="ml-auto"
                          onClick={() => probeCard(c)}
                          disabled={!!imagesLoadingCode}
                        >
                          {loadingThis ? <Loader2 className="animate-spin" size={16} /> : <ImageIcon size={16} />}
                          探图 / 探索
                        </PrimaryBtn>
                      </div>
                    </div>
                  );
                })}

                {!cards.length && (
                  <div className="text-[13px] text-[#6b7280]">
                    暂无结果。请先点击「检索 / 検索」。
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* RIGHT: Probe results */}
          <Card className="p-5">
            <div className="flex flex-col gap-1">
              <div className="text-[16px] font-semibold text-[#111827]">探图结果 / 探索結果</div>
              <div className="text-[12px] text-[#6b7280]">
                自动包含：小卡（L/{`{code}`}.jpg）・特殊画像（L/{`{code2}`}.jpg）・舞写/定妆（S/{`{prefix}`}-001..）
              </div>
            </div>

            <div className="mt-4">
              {!imagesResp && (
                <div className="rounded-2xl border border-black/10 bg-white/70 p-6 text-[13px] text-[#6b7280]">
                  左侧点击某条小卡的「探图 / 探索」后，这里会显示结果。
                </div>
              )}

              {imagesResp && imagesResp.error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
                  探图失败 / 探索失敗：{imagesResp.message || imagesResp.error}
                </div>
              )}

              {imagesResp && !imagesResp.error && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-black/10 bg-white/70 p-4">
                    <div className="text-[14px] font-semibold text-[#111827]">
                      {imagesResp.title && imagesResp.title.trim()
                        ? imagesResp.title
                        : "（标题未取回 / タイトル未取得）"}
                    </div>
                    <div className="mt-1 text-[12px] text-[#6b7280] font-mono">
                      code: {imagesResp.code}　troupe: {imagesResp.troupe_digit || "-"}　
                      prefix groups: {imagesResp.prefix_groups ? Object.keys(imagesResp.prefix_groups).length : 0}
                    </div>
                  </div>

                  {/* Top previews */}
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
                          <div className="mt-2 flex items-center justify-between text-[12px] text-[#6b7280]">
                            <button className="underline" onClick={() => copy(imagesResp.card_image!)}>
                              复制链接
                            </button>
                            <a className="underline font-semibold text-[#111827]" href={imagesResp.card_image} target="_blank" rel="noreferrer">
                              打开
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
                        {(imagesResp.special_images || []).length ? `共 ${(imagesResp.special_images || []).length} 张` : "无 / なし"}
                      </div>
                      {(imagesResp.special_images || []).slice(0, 1).map((u) => (
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
                          Object.keys(imagesResp.prefix_groups).slice(0, 5).map((p) => (
                            <div key={p} className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-3 py-2">
                              <div className="text-[12px] font-mono text-[#111827]">{p}</div>
                              <div className="text-[12px] text-[#6b7280]">
                                {imagesResp.prefix_groups?.[p]?.length || 0} 张
                              </div>
                            </div>
                          ))}
                        {(!imagesResp.prefix_groups || !Object.keys(imagesResp.prefix_groups).length) && (
                          <div className="text-[12px] text-[#6b7280]">未探测到 / 見つかりません</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* All images */}
                  <div className="flex items-center justify-between">
                    <div className="text-[15px] font-semibold text-[#111827]">全部图片 / 全画像</div>
                    <SoftBtn
                      onClick={() => copy(flatImages.map((x) => x.url).join("\n"))}
                      disabled={!flatImages.length}
                    >
                      <Copy size={16} /> 复制全部链接
                    </SoftBtn>
                  </div>

                  {!flatImages.length ? (
                    <div className="text-[13px] text-[#6b7280]">无结果 / なし</div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {flatImages.slice(0, 140).map((it, idx) => (
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
                              复制
                            </button>
                            <a className="underline font-semibold text-[#111827]" href={it.url} target="_blank" rel="noreferrer">
                              打开
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {flatImages.length > 140 && (
                    <div className="text-[12px] text-[#6b7280]">
                      仅预览前 140 张（完整链接可复制）。/ プレビューは140枚まで
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="mt-8 text-center text-[12px] text-[#6b7280]">
          Tip：如果线上探图失败，请先确认后端已部署最新 app.py，并且 Vercel 环境变量 <span className="font-mono">VITE_API_BASE</span> 指向正确后端域名。
        </div>
      </div>

      <Modal
        open={modalOpen}
        img={modalImg}
        onClose={() => {
          setModalOpen(false);
          setModalImg("");
        }}
      />
    </Shell>
  );
}