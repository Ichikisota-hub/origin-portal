import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface SalesData {
  total: {
    working_hours: number
    visits: number
    primary_face_to_face: number
    face_to_face: number
    meetings: number
    appointments: number
    contracts: number
    acquired_projects: number
  }
  by_user: Record<string, any>
  by_date: Record<string, any>
  by_area: Record<string, number>
}

export default function SalesAnalytics() {
  const [data, setData] = useState<SalesData | null>(null)
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week')
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    checkPermission()
  }, [])

  useEffect(() => {
    if (userRole && ['creator', 'admin'].includes(userRole)) {
      fetchAnalytics()
    }
  }, [period, userRole])

  async function checkPermission() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    setUserRole(profile?.role || '')
  }

  async function fetchAnalytics() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-sales-analytics?period=${period}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )
      const result = await res.json()
      if (result.success) {
        setData(result.aggregated)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  // 権限チェック
  if (!['creator', 'admin'].includes(userRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-gray-300 mb-2">アクセス権限がありません</h2>
          <p className="text-gray-500">この機能はAdmin以上の権限が必要です。</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">読み込み中...</div>
  }

  if (!data) return null

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">営業分析ダッシュボード</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as any)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="week">過去7日間</option>
          <option value="month">過去30日間</option>
          <option value="year">過去1年間</option>
        </select>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="総稼働時間" value={`${data.total.working_hours.toFixed(1)}h`} icon="⏱" />
        <StatCard title="訪問数" value={data.total.visits} icon="🚶" />
        <StatCard title="商談数" value={data.total.meetings} icon="💼" />
        <StatCard title="成約数" value={data.total.contracts} icon="✅" color="green" />
      </div>

      {/* メインメトリクス */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <MetricCard title="対面活動" data={[
          { label: '主権対面', value: data.total.primary_face_to_face },
          { label: '対面', value: data.total.face_to_face },
        ]} />
        <MetricCard title="営業成果" data={[
          { label: 'アポイント', value: data.total.appointments },
          { label: '獲得案件', value: data.total.acquired_projects },
        ]} />
      </div>

      {/* ユーザー別パフォーマンス */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">メンバー別パフォーマンス</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名前</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">訪問</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">商談</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">成約</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">稼働時間</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(data.by_user).map(([name, stats]: [string, any]) => (
                <tr key={name}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{stats.visits}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{stats.meetings}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-green-600 font-bold">{stats.contracts}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{stats.working_hours.toFixed(1)}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* エリア別成約 */}
      {Object.keys(data.by_area).length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">エリア別成約数</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(data.by_area).map(([area, count]) => (
              <div key={area} className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500">{area}</div>
                <div className="text-2xl font-bold text-blue-600">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// サブコンポーネント
function StatCard({ title, value, icon, color = 'blue' }: any) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
  }
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${colors[color as keyof typeof colors]}`}>{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  )
}

function MetricCard({ title, data }: { title: string; data: { label: string; value: number }[] }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="font-bold mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-gray-600">{item.label}</span>
            <span className="text-xl font-bold">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
