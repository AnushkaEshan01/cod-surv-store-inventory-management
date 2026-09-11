"use client";

import React, { useState, useEffect, useMemo } from "react";
import { TransactionLog } from "@/types";
import { subscribeToTransactions } from "@/lib/inventory-service";
import { exportTransactionsToCSV } from "@/lib/export-utils";
import {
  ClipboardList,
  Search,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  User,
  Clock,
} from "lucide-react";

export default function TransactionsPage() {
  const [logs, setLogs] = useState<TransactionLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "IN" | "OUT">("ALL");

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToTransactions(
      (updatedLogs) => {
        setLogs(updatedLogs);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        log.itemName.toLowerCase().includes(q) ||
        log.userEmail.toLowerCase().includes(q) ||
        (log.notes && log.notes.toLowerCase().includes(q));

      const matchesType = typeFilter === "ALL" || log.transactionType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [logs, searchQuery, typeFilter]);

  const totalIn = logs.filter((l) => l.transactionType === "IN").reduce((sum, l) => sum + l.amount, 0);
  const totalOut = logs.filter((l) => l.transactionType === "OUT").reduce((sum, l) => sum + l.amount, 0);

  return (
    <div className="py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Audit Log & History
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              Immutable
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 mt-1">
            Complete transaction ledger tracking every stock addition (IN) and deduction (OUT).
          </p>
        </div>

        <button
          onClick={() => exportTransactionsToCSV(filteredLogs)}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-white/70 dark:bg-zinc-800/70 hover:bg-white dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-700/60 shadow-2xs transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Mini Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl glass-card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            <ClipboardList className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-zinc-600 dark:text-zinc-300">Total Movements</div>
            <div className="text-xl font-semibold text-zinc-900 dark:text-white">
              {logs.length}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <ArrowDownLeft className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-xs text-zinc-600 dark:text-zinc-300">Total Received (IN)</div>
            <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
              +{totalIn.toLocaleString()} units
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
            <ArrowUpRight className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-xs text-zinc-600 dark:text-zinc-300">Total Issued (OUT)</div>
            <div className="text-xl font-semibold text-rose-600 dark:text-rose-400">
              -{totalOut.toLocaleString()} units
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Table Container */}
      <div className="glass-card rounded-3xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-zinc-200/50 dark:border-zinc-800/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by item, admin, remark..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
            />
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
            <span className="text-[11px] text-zinc-600 dark:text-zinc-300 px-2 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Action:
            </span>
            {(["ALL", "IN", "OUT"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  typeFilter === type
                    ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-2xs font-semibold"
                    : "text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white"
                }`}
              >
                {type === "ALL" ? "All Logs" : type === "IN" ? "Stock IN" : "Stock OUT"}
              </button>
            ))}
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-zinc-200/40 dark:border-zinc-800/40 bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-600 dark:text-zinc-300 font-medium">
                <th className="py-3 px-4 sm:px-6">Timestamp</th>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4 text-center">Movement Type</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4 hidden md:table-cell">Admin User</th>
                <th className="py-3 px-4 sm:px-6 hidden sm:table-cell">Reference / Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/30 dark:divide-zinc-800/30 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    Loading transaction ledger...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    No transactions found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isAdd = log.transactionType === "IN";
                  const dateObj = new Date(log.timestamp);
                  const formattedDate = dateObj.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const formattedTime = dateObj.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/20 transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 sm:px-6 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-medium">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{formattedDate}</span>
                        </div>
                        <div className="text-[11px] text-zinc-600 dark:text-zinc-300 ml-5">{formattedTime}</div>
                      </td>

                      {/* Item Name */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {log.itemName}
                        </span>
                      </td>

                      {/* Action Pill */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isAdd
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40"
                          }`}
                        >
                          {isAdd ? (
                            <ArrowDownLeft className="w-3 h-3 stroke-[2.5]" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                          )}
                          <span>{isAdd ? "STOCK IN" : "STOCK OUT"}</span>
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-semibold tracking-tight text-sm ${
                            isAdd
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isAdd ? `+${log.amount}` : `-${log.amount}`}
                        </span>
                      </td>

                      {/* Admin User */}
                      <td className="py-3 px-4 hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                          <User className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{log.userEmail}</span>
                        </div>
                      </td>

                      {/* Remarks */}
                      <td className="py-3 px-4 sm:px-6 hidden sm:table-cell text-xs text-zinc-500 dark:text-zinc-400">
                        {log.notes || <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="py-3 px-4 sm:px-6 border-t border-zinc-200/40 dark:border-zinc-800/40 text-xs text-zinc-400">
          Showing {filteredLogs.length} logged stock operations
        </div>
      </div>
    </div>
  );
}
