import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, PieChart, Inbox, Target } from "lucide-react";
import { getSalesTrends, getTopCategories } from "@/app/actions/reports";
import { getCurrentMonthQuotaSummary } from "@/app/actions/quotas";
import ReportsCharts from "./reports-charts";
import Link from "next/link";

export default async function ReportsAnalyticsPage() {
  try {
    // Fetch data on server side to avoid client-side MySQL2 imports
    const [trends, categories, quotaSummary] = await Promise.all([
      getSalesTrends(),
      getTopCategories(), 
      getCurrentMonthQuotaSummary()
    ]);

    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Analytics & Reports</h1>
            <p className="text-gray-500 text-sm">Visual representations of sales trends and category performance.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Trends Chart */}
          <Card className="shadow-sm border-0 rounded-xl lg:col-span-2">
            <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between bg-white rounded-t-xl">
              <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#005914]" />
                Sales Trends (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 h-80">
              {trends.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Inbox className="w-10 h-10 mb-2" />
                  <p className="text-sm font-medium">No sales data available</p>
                </div>
              ) : (
                <ReportsCharts type="sales" data={trends} />
              )}
            </CardContent>
          </Card>

          {/* Top Categories Chart */}
          <Card className="shadow-sm border-0 rounded-xl">
            <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between bg-white rounded-t-xl">
              <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-[#005914]" />
                Top Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 h-80">
              {categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Inbox className="w-10 h-10 mb-2" />
                  <p className="text-sm font-medium">No category data available</p>
                </div>
              ) : (
                <ReportsCharts type="categories" data={categories} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quota System Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm border-0 rounded-xl">
            <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between bg-white rounded-t-xl">
              <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Monthly Quota Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {quotaSummary.total_quotas > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{quotaSummary.total_quotas}</p>
                      <p className="text-xs text-gray-500">Total Quotas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{quotaSummary.completed_quotas}</p>
                      <p className="text-xs text-gray-500">Completed</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Target: ₱{quotaSummary.total_target.toLocaleString()}</span>
                      <span>Achieved: ₱{quotaSummary.total_achieved.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ 
                          width: `${Math.min((quotaSummary.total_achieved / quotaSummary.total_target) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      {quotaSummary.completion_rate}% completion rate this month
                    </p>
                  </div>

                  <Link href="/admin/quotas">
                    <button className="w-full p-2 text-sm bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors">
                      Manage Quotas →
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium mb-2">No Quotas Set</p>
                  <p className="text-sm mb-4">Track salesman targets and achievements</p>
                  <Link href="/admin/quotas">
                    <button className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                      Set Up Quotas
                    </button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0 rounded-xl">
            <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between bg-white rounded-t-xl">
              <CardTitle className="text-lg font-semibold text-gray-800">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <Link href="/admin/quotas">
                  <button className="w-full p-2 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                    Set Monthly Quotas
                  </button>
                </Link>
                <button className="w-full p-2 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                  View Performance Reports
                </button>
                <button className="w-full p-2 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                  Export Analytics Data
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Reports page error:", error);
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Inbox className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Reports Unavailable</h3>
          <p className="text-gray-500">Unable to load analytics data. Please check your database connection.</p>
        </div>
      </div>
    );
  }
}
