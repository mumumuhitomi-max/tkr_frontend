import React, { useState } from "react"
import { motion } from "framer-motion"
import { ToastContainer, toast } from "react-toastify"
import { Copy, Search, Loader2, Image as ImageIcon } from "lucide-react"
import "react-toastify/dist/ReactToastify.css"

const API_BASE =
  import.meta.env.VITE_API_BASE || "https://tkr-web-nw8a.onrender.com"

const App: React.FC = () => {
  const [tab, setTab] = useState<"steel" | "program" | "goethe">("program")

  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [year, setYear] = useState(2025)

  // fetch helper
  const fetchData = async (url: string) => {
    try {
      setLoading(true)
      const res = await fetch(url)
      const json = await res.json()
      setData(json.results || [])
      toast.success(`取得成功 (${json.results?.length || 0}件)`)
    } catch (err) {
      toast.error("取得失敗しました / 获取失败")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (tab === "program") {
      fetchData(`${API_BASE}/api/program?year=${year}&q=${encodeURIComponent(query)}`)
    } else if (tab === "steel") {
      fetchData(`${API_BASE}/api/bro?prefix=${encodeURIComponent(query)}`)
    } else if (tab === "goethe") {
      fetchData(`${API_BASE}/api/goethe`)
    }
  }

  const copyLinks = (rows: any[]) => {
    const links = rows.map((r) => r.url || "").join("\n")
    navigator.clipboard.writeText(links)
    toast.info("リンクをコピーしました / 链接已复制")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fffaf8] to-[#f9f5ff] text-[#1f2328] font-sans">
      <ToastContainer position="top-center" autoClose={2000} />

      {/* Header */}
      <div className="py-8 text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-[#7a4a55] tracking-wide">
          🪶 宝塚 ONLINE 商品探測器 Takarazuka Online Finder
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-4 mb-8">
        {[
          ["program", "公演プログラム / 场刊检索"],
          ["steel", "スチール写真リンク推測"],
          ["goethe", "公演名一括 / 批量检索"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={`px-4 py-2 rounded-full transition-all duration-300 ${
              tab === key
                ? "bg-[#f8e3e7] text-[#7a4a55] font-semibold shadow-md"
                : "bg-white hover:bg-[#fdf2f5]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Description */}
      <motion.div
        className="max-w-3xl mx-auto mb-8 text-center text-sm text-[#5b6068]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {tab === "steel" && (
          <p>
            スチール写真リンク推測とは：商品IDの法則（YYMMDDB + 組序号）をもとに、
            可能なURLを自動生成して探測します。例：「2511161」など。
          </p>
        )}
        {tab === "program" && (
          <p>
            公演プログラム（场刊）検索：年度・关键字で公式サイトの刊行情報を探索します。
            例如输入 “花組 Goethe”。
          </p>
        )}
        {tab === "goethe" && (
          <p>
            公演名一括（批量）检索：直接批量检索花组『Goethe』东京与梅艺两地版本。
            自动包含スチール与场刊。
          </p>
        )}
      </motion.div>

      {/* Search bar */}
      <div className="flex justify-center mb-6">
        {tab === "program" && (
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-[#f5c7d1] rounded-l-md px-3 py-2 w-24 text-center"
            placeholder="2025"
          />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border border-[#f5c7d1] px-3 py-2 w-64 focus:outline-none"
          placeholder={tab === "steel" ? "例: 2511161" : "例: 花組 Goethe"}
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-[#f5c7d1] hover:bg-[#f1b4c3] rounded-r-md text-[#7a4a55] flex items-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
          検索 / Search
        </button>
      </div>

      {/* Results */}
      <div className="max-w-5xl mx-auto mb-20">
        {loading && (
          <div className="text-center text-[#7a4a55] animate-pulse">
            <Loader2 className="animate-spin inline mr-2" />
            読み込み中 / 加载中...
          </div>
        )}

        {!loading && data.length > 0 && (
          <div className="bg-white/70 backdrop-blur-md rounded-xl shadow-md p-4 transition-all duration-300">
            <div className="flex justify-between mb-2 text-sm text-[#7a4a55]">
              <span>结果 / 結果: {data.length}件</span>
              <button
                onClick={() => copyLinks(data)}
                className="flex items-center gap-1 hover:text-[#e36c89]"
              >
                <Copy size={14} /> リンクをコピー
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {data.map((r, i) => {
                const img =
                  r.image_url || r.image || r.img || r.thumb || r.imageLink || ""
                return (
                  <div
                    key={i}
                    className="bg-white border border-[#f2e2e8] rounded-lg p-3 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="font-semibold mb-2 text-sm">{r.title}</div>
                    {img ? (
                      <img
                        src={img}
                        alt={r.title}
                        className="rounded-md w-full h-40 object-contain mb-2"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-40 bg-[#fdf4f7] text-[#c89ca6] text-sm">
                        <ImageIcon size={18} className="mr-1" /> 無图 / no image
                      </div>
                    )}
                    <a
                      href={r.url}
                      target="_blank"
                      className="text-[#7a4a55] text-xs underline hover:text-[#c25b78]"
                    >
                      🔗 {r.url}
                    </a>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
