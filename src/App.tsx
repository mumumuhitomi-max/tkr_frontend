import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Image as ImageIcon,
  Camera,
  Link2,
  Loader2,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Target,
} from 'lucide-react'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

type TabKey = 'steel' | 'program' | 'bulk' | 'probe'

interface ProgramRow {
  title?: string
  price?: string
  release_date?: string
  url?: string
  code?: string
  venue_group?: string
}

interface BroRow {
  title?: string
  url?: string
  code?: string
  ok?: boolean
}

interface ProgramResponse {
  year: number
  queries: string[]
  results: ProgramRow[]
}

interface BroResponse {
  prefix: string
  results: BroRow[]
}

interface CodeProbeRow {
  code: string
  page_ok: boolean
  img_ok: boolean
  page_url: string
  img_url: string
}

interface CodeProbeResponse {
  prefix: string
  range: { min: number; max: number }
  results: CodeProbeRow[]
}

// 从程序册 / スチール链接中提取数字编码，例如 "https://.../g/g672176/" → "672176"
function extractCodeFromUrl(url?: string | null): string | null {
  if (!url) return null
  const m = url.match(/\/g\/g(\d+)\//)
  return m ? m[1] : null
}

// 根据编码构造图片地址，index=1 就是 _01.jpg
function buildImageUrl(code: string, index = 1): string {
  const idx = String(index).padStart(2, '0')
  return `https://shop.tca-pictures.net/shop/itemimages/${code}_${idx}.jpg`
}

const tabs: { key: TabKey; labelJa: string; labelCn: string; icon: React.ReactNode }[] = [
  {
    key: 'steel',
    labelJa: 'スチール写真リンク推測',
    labelCn: 'スチール写真链接推测',
    icon: <Camera className="w-4 h-4" />,
  },
  {
    key: 'program',
    labelJa: '公演プログラム',
    labelCn: '场刊检索',
    icon: <ImageIcon className="w-4 h-4" />,
  },
  {
    key: 'bulk',
    labelJa: '公演名一括',
    labelCn: '批量检索',
    icon: <Search className="w-4 h-4" />,
  },
  {
    key: 'probe',
    labelJa: 'コード範囲探測',
    labelCn: 'CODE 区间探测',
    icon: <Target className="w-4 h-4" />,
  },
]

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('program')

  // 公演プログラム
  const [programYear, setProgramYear] = useState<number>(2025)
  const [programKeyword, setProgramKeyword] = useState<string>('花組')
  const [programLoading, setProgramLoading] = useState<boolean>(false)
  const [programResults, setProgramResults] = useState<ProgramRow[]>([])

  // スチール（BRO）
  const [broPrefix, setBroPrefix] = useState<string>('2251101300')
  const [broSsMin, setBroSsMin] = useState<number>(1)
  const [broSsMax, setBroSsMax] = useState<number>(40)
  const [broLoading, setBroLoading] = useState<boolean>(false)
  const [broResults, setBroResults] = useState<BroRow[]>([])
  const [broLastRange, setBroLastRange] = useState<{ min: number; max: number } | null>(null)

  // 公演名一括
  const [bulkYear, setBulkYear] = useState<number>(2025)
  const [bulkNames, setBulkNames] = useState<string>('悪魔城ドラキュラ\nGUYS AND DOLLS')
  const [bulkLoading, setBulkLoading] = useState<boolean>(false)
  const [bulkResults, setBulkResults] = useState<ProgramRow[]>([])

  // CODE 区间探测
  const [probePrefix, setProbePrefix] = useState<string>('6742')
  const [probeMin, setProbeMin] = useState<number>(10)
  const [probeMax, setProbeMax] = useState<number>(40)
  const [probeLoading, setProbeLoading] = useState<boolean>(false)
  const [probeResults, setProbeResults] = useState<CodeProbeRow[]>([])
  const [probeLastRange, setProbeLastRange] = useState<{ min: number; max: number } | null>(null)

  // 大图 modal
  const [modalImage, setModalImage] = useState<string | null>(null)
  const [modalTitle, setModalTitle] = useState<string>('')

  const apiGet = async (path: string, params: Record<string, string | number | string[] | undefined>) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return
      if (k === 'q' && Array.isArray(v)) {
        v.forEach((val) => qs.append('q', String(val)))
      } else {
        qs.set(k, String(v))
      }
    })
    const url = `${API_BASE}${path}?${qs.toString()}`
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    return res.json()
  }

  // 公演プログラム检索
  const handleProgramSearch = async () => {
    try {
      setProgramLoading(true)
      const json: ProgramResponse = await apiGet('/api/program', {
        year: programYear,
        q: programKeyword.trim() || undefined,
      })
      setProgramResults(json.results || [])
      toast.success('公演プログラムを取得しました / 场刊结果已更新')
    } catch (e) {
      console.error(e)
      toast.error('取得に失敗しました / 获取失败')
    } finally {
      setProgramLoading(false)
    }
  }

  // スチール照片链接推测（BRO）
  const handleBroSearch = async () => {
    if (!broPrefix.trim()) {
      toast.info('プレフィックスを入力してください / 请输入前缀')
      return
    }
    try {
      setBroLoading(true)
      setBroLastRange({ min: broSsMin, max: broSsMax })
      const json: BroResponse = await apiGet('/api/bro', {
        prefix: broPrefix.trim(),
        ss_min: broSsMin,
        ss_max: broSsMax,
      })
      setBroResults(json.results || [])
      toast.success('スチール候補を取得しました / スチール候选已更新')
    } catch (e) {
      console.error(e)
      toast.error('取得に失敗しました / 获取失败')
    } finally {
      setBroLoading(false)
    }
  }

  // 公演名一括 / 批量检索
  const handleBulkSearch = async () => {
    const lines = bulkNames
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    if (!lines.length) {
      toast.info('公演名を入力してください / 请输入公演名称')
      return
    }
    try {
      setBulkLoading(true)
      const json: ProgramResponse = await apiGet('/api/program', {
        year: bulkYear,
        q: lines,
      })
      setBulkResults(json.results || [])
      toast.success('公演名で一括検索しました / 批量检索完成')
    } catch (e) {
      console.error(e)
      toast.error('取得に失敗しました / 获取失败')
    } finally {
      setBulkLoading(false)
    }
  }

  // CODE 区间探测
  const handleProbeSearch = async () => {
    if (!probePrefix.trim()) {
      toast.info('プレフィックスを入力してください / 请输入 CODE 前缀')
      return
    }
    if (probeMax < probeMin) {
      toast.info('終了番号は開始番号以上である必要があります / 结束号需大于等于起始号')
      return
    }
    try {
      setProbeLoading(true)
      setProbeLastRange({ min: probeMin, max: probeMax })
      const json: CodeProbeResponse = await apiGet('/api/code_probe', {
        prefix: probePrefix.trim(),
        ss_min: probeMin,
        ss_max: probeMax,
      })
      setProbeResults(json.results || [])
      toast.success('コード範囲の探測が完了しました / CODE 区间探测完成')
    } catch (e) {
      console.error(e)
      toast.error('取得に失敗しました / 获取失败')
    } finally {
      setProbeLoading(false)
    }
  }

  const renderImageCell = (row: { url?: string; code?: string; title?: string }) => {
    const code = row.code && row.code.length > 0 ? row.code : extractCodeFromUrl(row.url)
    if (!code) {
      return <span className="text-xs text-gray-400">无图 / no image</span>
    }
    const imgUrl = buildImageUrl(code, 1)
    return (
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={() => {
            setModalImage(imgUrl)
            setModalTitle(row.title || code)
          }}
          className="text-xs md:text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          <ImageIcon className="w-3 h-3" />
          画像を開く / Open image
        </button>
        <img
          src={imgUrl}
          alt={row.title || code}
          className="w-16 h-24 md:w-20 md:h-28 object-cover rounded border border-gray-200 cursor-zoom-in"
          loading="lazy"
          onClick={() => {
            setModalImage(imgUrl)
            setModalTitle(row.title || code)
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>
    )
  }

  const steelProgress =
    broLastRange && broLastRange.max >= broLastRange.min
      ? Math.min(
          100,
          Math.round(
            (broResults.length / (broLastRange.max - broLastRange.min + 1 || 1)) * 100,
          ),
        )
      : 0

  const probeProgress =
    probeLastRange && probeLastRange.max >= probeLastRange.min
      ? Math.min(
          100,
          Math.round(
            (probeResults.length /
              (probeLastRange.max - probeLastRange.min + 1 || 1)) * 100,
          ),
        )
      : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f9fafb] via-[#fef9f7] to-[#fdf6ff] text-[#111827]">
      {/* Header */}
      <header className="border-b border-[#e5e7eb]/80 bg-white/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-300 via-rose-200 to-amber-200 border border-white shadow-md flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#1f2937]" />
            </div>
            <div>
              <h1 className="text-[18px] md:text-[20px] font-semibold tracking-wide text-[#111827]">
                Takarazuka Link Finder
              </h1>
              <p className="text-xs md:text-[13px] text-[#6b7280]">
                宝塚 ONLINE 商品リンク & 画像パターン探索 / 在线商品链接 & 图片模式探测器
              </p>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end text-[11px] text-[#6b7280]">
            <span>Backend: {API_BASE}</span>
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              If no result, check API_BASE settings.
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 pb-12 pt-5">
        {/* Tabs */}
        <div className="mb-4">
          <div className="inline-flex rounded-full bg-white/70 backdrop-blur border border-[#e5e7eb] p-1 shadow-sm">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[11px] md:text-[13px] flex items-center gap-1.5 transition-all ${
                  activeTab === t.key
                    ? 'bg-gradient-to-r from-pink-100 to-amber-100 text-[#111827] shadow-sm'
                    : 'text-[#6b7280] hover:text-[#111827]'
                }`}
              >
                {t.icon}
                <span className="hidden md:inline">
                  {t.labelJa} / {t.labelCn}
                </span>
                <span className="md:hidden">{t.labelJa}</span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* スチール写真链接推测 */}
          {activeTab === 'steel' && (
            <motion.section
              key="steel"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              {/* 说明 */}
              <div className="bg-white/80 backdrop-blur-md border border-[#e5e7eb] shadow-sm rounded-2xl p-4 md:p-5 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-pink-500" />
                  <h2 className="text-[15px] md:text-[16px] font-semibold text-[#111827]">
                    スチール写真リンク推測 / スチール写真链接推测
                  </h2>
                </div>
                <p className="text-[12px] md:text-[13px] text-[#4b5563] leading-relaxed">
                  BRO（スチール写真）の商品コード前半
                  <span className="font-mono text-xs bg-pink-50 px-1.5 py-0.5 rounded ml-1 mr-1">
                    2251101300
                  </span>
                  などをプレフィックスとして指定し、
                  <span className="font-mono text-xs bg-pink-50 px-1.5 py-0.5 rounded mx-1">
                    _01 ～ _40
                  </span>
                  の候補を一括でチェックします。結果から
                  <span className="font-mono text-xs bg-pink-50 px-1.5 py-0.5 rounded mx-1">
                    itemimages/&lt;CODE&gt;_01.jpg
                  </span>
                  を自動組み立てて画像を表示します。
                </p>
              </div>

              {/* 表单 */}
              <div className="bg-white/80 backdrop-blur-md border border-[#e5e7eb] shadow-sm rounded-2xl p-4 md:p-5 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] md:text-[12px] text-[#6b7280] mb-1">
                      プレフィックス / 前缀 (例: 2251101300)
                    </label>
                    <input
                      value={broPrefix}
                      onChange={(e) => setBroPrefix(e.target.value)}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-white/70 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] md:text-[12px] text-[#6b7280] mb-1">
                      開始番号 / 起始号 (ss_min)
                    </label>
                    <input
                      type="number"
                      value={broSsMin}
                      onChange={(e) => setBroSsMin(Number(e.target.value) || 1)}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-white/70 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] md:text-[12px] text-[#6b7280] mb-1">
                      終了番号 / 结束号 (ss_max)
                    </label>
                    <input
                      type="number"
                      value={broSsMax}
                      onChange={(e) => setBroSsMax(Number(e.target.value) || 40)}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-white/70 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleBroSearch}
                    disabled={broLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[13px] px-4 py-2 shadow-md hover:shadow-lg active:scale-[0.98] transition disabled:opacity-60"
                  >
                    {broLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        検索中… / 检索中…
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        スチール候補を検索 / 搜索候选
                      </>
                    )}
                  </button>

                  {broLastRange && (
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center justify-between text-[11px] text-[#6b7280] mb-1">
                        <span>探索进度 / Scan progress</span>
                        <span>
                          {broResults.length} /{' '}
                          {broLastRange.max - broLastRange.min + 1 || 1}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#f3f4f6] overflow-hidden">
                        <div
                          className="h-2 bg-gradient-to-r from-pink-400 to-amber-400 transition-all"
                          style={{ width: `${steelProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 结果 */}
              <div className="bg-white/80 backdrop-blur-md border border-[#e5e7eb] shadow-sm rounded-2xl p-3 md:p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[14px] md:text-[15px] font-semibold text-[#111827] flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-pink-500" />
                    検索結果 / 检索结果
                  </h3>
                  <span className="text-[11px] text-[#6b7280]">
                    {broResults.length} ヒット / 条
                  </span>
                </div>
                {broResults.length === 0 ? (
                  <p className="text-[12px] text-[#9ca3af]">
                    まだ結果がありません。上でプレフィックスを入力して検索してみてください。
                    / 暂无结果，请先在上方输入前缀进行检索。
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-[12px] md:text-[13px]">
                      <thead>
                        <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                          <th className="text-left px-2 py-2 font-medium text-[#6b7280]">
                            CODE
                          </th>
                          <th className="text-left px-2 py-2 font-medium text-[#6b7280]">
                            リンク / 链接
                          </th>
                          <th className="text-left px-2 py-2 font-medium text-[#6b7280]">
                            画像 / Image
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {broResults.map((row, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-[#f3f4f6] hover:bg-pink-50/40 transition"
                          >
                            <td className="px-2 py-2 font-mono text-xs text-[#111827]">
                              {row.code || extractCodeFromUrl(row.url) || '-'}
                            </td>
                            <td className="px-2 py-2 align-top">
                              {row.url ? (
                                <a
                                  href={row.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-blue-600 hover:underline break-all"
                                >
                                  <ChevronRight className="w-3 h-3" />
                                  {row.url}
                                </a>
                              ) : (
                                <span className="text-xs text-[#9ca3af]">-</span>
                              )}
                            </td>
                            <td className="px-2 py-2 align-top">{renderImageCell(row)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {/* 公演プログラム / 场刊检索 */}
          {activeTab === 'program' && (
            <motion.section
              key="program"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              <div className="bg-white/80 backdrop-blur-md border border-[#e5e7eb] shadow-sm rounded-2xl p-4 md:p-5 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-pink-500" />
                  <h2 className="text-[15px] md:text-[16px] font-semibold text-[#111827]">
                    公演プログラム / 场刊检索
                  </h2>
                </div>
                <p className="text-[12px] md:text-[13px] text-[#4b5563] leading-relaxed">
                  年度とキーワード（花組、作品名など）で
                  <span className="font-mono text-xs bg-pink-50 px-1.5 py-0.5 rounded mx-1">
                    cpro
                  </span>
                  配下の公演プログラムを検索し、
                  <span className="font-mono text-xs bg-pink-50 px-1.5 py-0.5 rounded mx-1">
                    gNNNNNN
                  </span>
                  から自動的に
                  <span className="font-mono text-xs bg-pink-50 px-1.5 py-0.5 rounded mx-1">
                    itemimages/NNNNNN_01.jpg
                  </span>
                  を推測して画像を表示します。
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-md border border-[#e5e7eb] shadow-sm rounded-2xl p-4 md:p-5 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-[11px] md:text-[12px] text-[#6b7280] mb-1">
                      年度 / Year
                    </label>
                    <input
                      type="number"
                      value={programYear}
                      onChange={(e) => setProgramYear(Number(e.target.value) || 2025)}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-white/70 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] md:text-[12px] text-[#6b7280] mb-1">
                      キーワード / 关键字（花組、作品名…）
                    </label>
                    <input
                      value={programKeyword}
                      onChange={(e) => setProgramKeyword(e.target.value)}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-white/70 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleProgramSearch}
                      disabled={programLoading}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[13px] px-4 py-2.5 shadow-md hover:shadow-lg active:scale-[0.98] transition disabled:opacity-60"
                    >
                      {programLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          検索中… / 检索中…
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          公演プログラム検索 / 搜索场刊
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-md border border-[#e5e7eb] shadow-sm rounded-2xl p-3 md:p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[14px] md:text-[15px] font-semibold text-[#111827] flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-pink-500" />
                    検索結果 / 检索结果
                  </h3>
                  <span className="text-[11px] text-[#6b7280]">
                    {programResults.length} ヒット / 条
                  </span>
                </div>
                {programResults.length === 0 ? (
                  <p className="text-[12px] text-[#9ca3af]">
                    まだ結果がありません。年度とキーワードを指定して検索してください。
                    / 暂无结果，请先输入年度和关键字进行检索。
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-[12px] md:text-[13px]">
                      <thead>
                        <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                          <th className="text-left px-2 py-2 font-medium text-[#6b7280]">
                            タイトル / 标题
                          </th>
                          <th className="text-left px-2 py-2 font-medium text-[#6b7280]">
                            リンク / 链接
                          </th>
                          <th className="text-left px-2 py-2 font-medium text-[#6b7280]">
                            画像 / Image
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {programResults.map((row, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-[#f3f4f6] hover:bg-pink-50/40 transition"
                          >
                            <td className="px-2 py-2 align-top">
                              <div className="flex flex-col gap-1">
                                <span className="text-[#111827]">
                                  {row.title || '(No title)'}
                                </span>
                                <span className="text-[11px] text-[#9ca3af]">
                                  {row.venue_group || '会場未分類 / Venue UNK'}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 py-2 align-top">
                              {row.url ? (
                                <a
                                  href={row.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-blue-600 hover:underline break-all"
                                >
                                  <ChevronRight className="w-3 h-3" />
                                  {row.url}
                                </a>
                              ) : (
                                <span className="text-xs text-[#9ca3af]">-</span>
                              )}
                            </td>
                            <td className="px-2 py-2 align-top">{renderImageCell(row)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {/* 公演名一括 / 批量检索 */}
          {activeTab === 'bulk' && (
            <motion.section
              key="bulk"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              <div className="bg-white/80 backdrop-blur-md border border-[#e5e7eb] shadow-sm rounded-2xl p-4 md:p-5 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-pink-500" />
                  <h2 className="text-[15px] md:text-[16px] font-semibold text-[#111827]">
                    公演名一括 / 批量检索
                  </h2>
                </div>
                <p className="text-[12px] md:text-[13px] text-[#4b5563] leading-relaxed">
                  公演名を改行区切りで入力すると、
                  <span className="font-mono text-xs bg-pink-50 px-1.5 py-0.5 rounded mx-1">
                    /api/program
                  </span>
                  に対して
                  <span className="font-mono text-xs bg-pink-50 px-1.5 py-0.5 rounded mx-1">
                    q=公演1&amp;q=公演2…
                  </span>
                  で一括問い合わせを行い、
                  結果のリンクから自動的に画像 URL を推測して表示します。
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-md border border-[#e5e7eb] shadow-sm rounded-2xl p-4 md:p-5 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] md:text-[12px] text-[#6b7280] mb-1">
                      年度 / Year
                    </label>
                    <input
                      type="number"
                      value={bulkYear}
                      onChange={(e) => setBulkYear(Number(e.target.value) || 2025)}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-white/70 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] md:text-[12px] text-[#6b7280] mb-1">
                      公演名リスト / 公演名称列表（1 行 1 作品）
                    </label>
                    <textarea
                      value={bulkNames}
                      onChange={(e) => setBulkNames(e.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-white/70 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
                      placeholder={`例：\n悪魔城ドラキュラ\nGUYS AND DOLLS\nGoethe（ゲーテ）!`}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleBulkSearch}
                    disabled={bulkLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[13px] px-4 py-2.5 shadow-md hover:shadow-lg active:scale-[0.98] transition disabled:opacity-60"
                  >
                    {bulkLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        一括検索中… / 批量检索中…
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        公演名で一括検索 / 按公演名批量搜索
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-md border border-[#e5e7eb] shadow-sm rounded-2xl p-3 md:p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[14px] md:text-[15px] font-semibold text-[#111827] flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-pink-500" />
                    検索結果 / 检索结果
                  </h3>
                  <span className="text-[11px] text-[#6b7280]">
                    {bulkResults.length} ヒット / 条
                  </span>
                </div>
                {bulkResults.length === 0 ? (
                  <p className="text-[12px] text-[#9ca3af]">
                    まだ結果がありません。公演名を入力して一括検索してください。
                    / 暂无结果，请先输入公演名进行批量检索。
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-[12px] md:text-[13px]">
                      <thead>
                        <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                          <th className="text-left px-2 py-2 font-medium text-[#6b7280]">
                            タイトル / 标题
                          </th>
                          <th className="text-left px-2 py-2 font-medium text-[#6b7280]">
                            リンク / 链接
                          </th>
                          <th className="text-left px-2 py-2 font-medium text-[#6b7280]">
                            画像 / Image
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkResults.map((row, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-[#f3f4f6] hover:bg-pink-50/40 transition"
                          >
                            <td className="px-2 py-2 align-top">
                              <div className="flex flex-col gap-1">
                                <span className="text-[#111827]">
                                  {row.title || '(No title)'}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 py-2 align-top">
                              {row.url ? (
                                <a
                                  href={row.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-blue-600 hover:underline break-all"
                                >
                                  <ChevronRight className="w-3 h-3" />
                                  {row.url}
                                </a>
                              ) : (
                                <span className="text-xs text-[#9ca3af]">-</span>
                              )}
                            </td>
                            <td className="px-2 py-2 align-top">{renderImageCell(row)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {/* コード範囲探測 / CODE 区间探测 */}
          {activeTab === 'probe' && (
            <motion.section
              key="probe"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              <div className="bg-white/80 backdrop-blur-md border border-[#e5e7eb] shadow-sm rounded-2xl p-4 md:p-5 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-pink-500" />
                  <h2 className="text-[15px] md:text-[16px] font-semibold text-[#111827]">
                    コード範囲探測 / CODE 区间探测
                  </h2>
                </div>
                <p className="text-[12px] md:text-[13px] text-[#4b5563] leading-relaxed">
                  まだ
                  <span className="font-mono text-xs bg-pink-50 px-1.5 py-0.5 rounded mx-1">
                    cpro
                  </span>
                  リストに載っていない可能性のある商品を、
                  <span className="font-mono text-xs bg-pink-50 px-1.5 py-0.5 rounded mx-1">
                    g/gCODE/
                  </span>
                  と
                  <span className="font-mono text-xs bg-pink-50 px-1.5 py-0.5 rounded mx-1">
                    itemimages/CODE_01.jpg
                  </span>
                  に対する HEAD リクエストで直接探測します。
                  例：prefix=
                  <span className="font-mono text-xs bg-pink-50 px-1.5 py-0.5 rounded mx-1">
                    6742
                  </span>
                  ，范围 10〜40 → 674210〜674240 を一括チェック。
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-md border border-[#e5e7eb] shadow-sm rounded-2xl p-4 md:p-5 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-[11px] md:text-[12px] text-[#6b7280] mb-1">
                      プレフィックス / 前缀 (例: 6742)
                    </label>
                    <input
                      value={probePrefix}
                      onChange={(e) => setProbePrefix(e.target.value)}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-white/70 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] md:text-[12px] text-[#6b7280] mb-1">
                      開始下2桁 / 起始后两位
                    </label>
                    <input
                      type="number"
                      value={probeMin}
                      onChange={(e) => setProbeMin(Number(e.target.value) || 0)}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-white/70 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] md:text-[12px] text-[#6b7280] mb-1">
                      終了下2桁 / 结束后两位
                    </label>
                    <input
                      type="number"
                      value={probeMax}
                      onChange={(e) => setProbeMax(Number(e.target.value) || 0)}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-white/70 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleProbeSearch}
                      disabled={probeLoading}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[13px] px-4 py-2.5 shadow-md hover:shadow-lg active:scale-[0.98] transition disabled:opacity-60"
                    >
                      {probeLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          探測中… / 探测中…
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          コード探測 / 探测 CODE
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {probeLastRange && (
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center justify-between text-[11px] text-[#6b7280] mb-1">
                      <span>探索进度 / Scan progress</span>
                      <span>
                        {probeResults.length} /{' '}
                        {probeLastRange.max - probeLastRange.min + 1 || 1}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#f3f4f6] overflow-hidden">
                      <div
                        className="h-2 bg-gradient-to-r from-pink-400 to-amber-400 transition-all"
                        style={{ width: `${probeProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white/80 backdrop-blur-md border border-[#e5e7eb] shadow-sm rounded-2xl p-3 md:p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[14px] md:text-[15px] font-semibold text-[#111827] flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-pink-500" />
                    探測結果 / 探测结果
                  </h3>
                  <span className="text-[11px] text-[#6b7280]">
                    {probeResults.length} HIT
                  </span>
                </div>
                {probeResults.length === 0 ? (
                  <p className="text-[12px] text-[#9ca3af]">
                    まだ HIT がありません。プレフィックスと下2桁範囲を指定して探測してみてください。
                    / 暂无命中，请先指定前缀与后两位范围进行探测。
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-[12px] md:text-[13px]">
                      <thead>
                        <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                          <th className="text-left px-2 py-2 font-medium text-[#6b7280]">
                            CODE
                          </th>
                          <th className="text-left px-2 py-2 font-medium text-[#6b7280]">
                            PAGE / 页面
                          </th>
                          <th className="text-left px-2 py-2 font-medium text-[#6b7280]">
                            IMG / 图片
                          </th>
                          <th className="text-left px-2 py-2 font-medium text-[#6b7280]">
                            画像プレビュー / 预览
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {probeResults.map((row, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-[#f3f4f6] hover:bg-pink-50/40 transition"
                          >
                            <td className="px-2 py-2 font-mono text-xs text-[#111827]">
                              {row.code}
                              <div className="text-[10px] text-[#9ca3af]">
                                {row.page_ok ? 'PAGE✓ ' : 'PAGE× '}
                                {row.img_ok ? 'IMG✓' : 'IMG×'}
                              </div>
                            </td>
                            <td className="px-2 py-2 align-top">
                              <a
                                href={row.page_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 hover:underline break-all"
                              >
                                <ChevronRight className="w-3 h-3" />
                                {row.page_url}
                              </a>
                            </td>
                            <td className="px-2 py-2 align-top">
                              <a
                                href={row.img_url}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex items-center gap-1 break-all ${
                                  row.img_ok
                                    ? 'text-blue-600 hover:underline'
                                    : 'text-[#9ca3af]'
                                }`}
                              >
                                <ImageIcon className="w-3 h-3" />
                                {row.img_url}
                              </a>
                            </td>
                            <td className="px-2 py-2 align-top">
                              {row.img_ok ? (
                                renderImageCell({
                                  code: row.code,
                                  url: row.page_url,
                                  title: `CODE ${row.code}`,
                                })
                              ) : (
                                <span className="text-xs text-[#9ca3af]">
                                  画像未上传 / 图片尚未存在
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* 图片放大 Modal */}
      <AnimatePresence>
        {modalImage && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-xl max-w-md w-[90%] md:w-[420px] p-4 relative"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <button
                className="absolute top-2 right-3 text-[#6b7280] text-sm"
                onClick={() => setModalImage(null)}
              >
                ✕
              </button>
              <h3 className="text-[14px] md:text-[15px] font-semibold text-[#111827] mb-2 pr-6">
                {modalTitle}
              </h3>
              <div className="border border-[#e5e7eb] rounded-xl overflow-hidden bg-[#f9fafb] flex items-center justify-center">
                <img
                  src={modalImage}
                  alt={modalTitle}
                  className="max-h-[60vh] w-auto object-contain"
                />
              </div>
              <a
                href={modalImage}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-[12px] text-blue-600 hover:underline break-all"
              >
                <Link2 className="w-3 h-3" />
                {modalImage}
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ToastContainer position="bottom-right" theme="light" />
    </div>
  )
}

export default App