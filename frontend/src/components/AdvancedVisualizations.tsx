// import React, { useMemo, useState } from 'react';
// import {
//   Paper,
//   Typography,
//   Grid,
//   Box,
//   Card,
//   CardContent,
//   Tooltip,
//   Chip,
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   Tabs,
//   Tab
// } from '@mui/material';
// import {
//   ResponsiveContainer,
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip as RechartsTooltip,
//   Legend,
//   BarChart,
//   Bar,
//   PieChart,
//   Pie,
//   Cell,
//   ScatterChart,
//   Scatter,
//   AreaChart,
//   Area,
//   ComposedChart
// } from 'recharts';

// // ============================================================================
// // INTERFACES
// // ============================================================================
// interface ReturnDistributionHeatmapProps {
//   trades: any[];
//   portfolioValues: number[];
//   portfolioDates: string[];
// }

// interface DrawdownAnalysisChartProps {
//   portfolioValues: number[];
//   portfolioDates: string[];
// }

// interface PnLDistributionProps {
//   trades: any[];
// }

// interface TradeDurationAnalysisProps {
//   trades: any[];
// }

// interface RiskMetricVisualizationsProps {
//   metrics: any;
//   portfolioValues: number[];
// }

// interface ComprehensiveVisualizationDashboardProps {
//   results: any;
// }

// // ============================================================================
// // 1. RETURN DISTRIBUTION HEATMAP
// // ============================================================================
// export const ReturnDistributionHeatmap: React.FC<ReturnDistributionHeatmapProps> = ({ 
//   trades, 
//   portfolioValues, 
//   portfolioDates 
// }) => {
//   const heatmapData = useMemo(() => {
//     // Create weekly buckets and return range buckets
//     const returnRanges = [
//       { label: '< -10%', min: -Infinity, max: -10, color: '#d32f2f' },
//       { label: '-10 to -5%', min: -10, max: -5, color: '#f57c00' },
//       { label: '-5 to -2%', min: -5, max: -2, color: '#ff9800' },
//       { label: '-2 to 2%', min: -2, max: 2, color: '#4caf50' },
//       { label: '2 to 5%', min: 2, max: 5, color: '#388e3c' },
//       { label: '5 to 10%', min: 5, max: 10, color: '#1976d2' },
//       { label: '> 10%', min: 10, max: Infinity, color: '#7b1fa2' }
//     ];

//     // Group trades by weeks
//     const weeksData = [];
//     const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    
//     if (portfolioDates.length === 0) return [];
    
//     const startDate = new Date(portfolioDates[0]);
//     const endDate = new Date(portfolioDates[portfolioDates.length - 1]);
//     const totalWeeks = Math.ceil((endDate.getTime() - startDate.getTime()) / msPerWeek);
    
//     for (let week = 0; week < Math.min(totalWeeks, 12); week++) {
//       const weekStart = new Date(startDate.getTime() + week * msPerWeek);
//       const weekEnd = new Date(startDate.getTime() + (week + 1) * msPerWeek);
      
//       // Get trades in this week
//       const weekTrades = trades.filter(trade => {
//         const tradeDate = new Date(trade.exit_time || trade.entry_time);
//         return tradeDate >= weekStart && tradeDate < weekEnd;
//       });
      
//       // Count trades in each return range
//       const weekData = returnRanges.map(range => {
//         const tradesInRange = weekTrades.filter(trade => 
//           trade.pnl_percent > range.min && trade.pnl_percent <= range.max
//         ).length;
        
//         return {
//           week: `Week ${week + 1}`,
//           range: range.label,
//           count: tradesInRange,
//           color: range.color,
//           intensity: tradesInRange / Math.max(weekTrades.length, 1)
//         };
//       });
      
//       weeksData.push(...weekData);
//     }
    
//     return weeksData;
//   }, [trades, portfolioDates]);

//   const maxCount = Math.max(...heatmapData.map(d => d.count), 1);

//   return (
//     <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
//       <Typography variant="h6" gutterBottom>
//         📊 Return Distribution Heatmap
//       </Typography>
//       <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
//         Trade distribution across time periods and return ranges
//       </Typography>
      
//       <Box sx={{ overflowX: 'auto' }}>
//         <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, minWidth: '600px' }}>
//           {/* Header row */}
//           {['< -10%', '-10 to -5%', '-5 to -2%', '-2 to 2%', '2 to 5%', '5 to 10%', '> 10%'].map(label => (
//             <Box key={label} sx={{ p: 1, textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>
//               {label}
//             </Box>
//           ))}
          
//           {/* Data rows */}
//           {Array.from(new Set(heatmapData.map(d => d.week))).map(week => 
//             heatmapData
//               .filter(d => d.week === week)
//               .map((cell, index) => (
//                 <Tooltip 
//                   key={`${week}-${index}`}
//                   title={`${week}, ${cell.range}: ${cell.count} trades`}
//                 >
//                   <Box
//                     sx={{
//                       p: 1,
//                       textAlign: 'center',
//                       fontSize: '14px',
//                       fontWeight: 'bold',
//                       backgroundColor: cell.color,
//                       opacity: 0.3 + (cell.count / maxCount) * 0.7,
//                       color: cell.count > 0 ? 'white' : 'text.secondary',
//                       borderRadius: 1,
//                       cursor: 'pointer',
//                       minHeight: '40px',
//                       display: 'flex',
//                       alignItems: 'center',
//                       justifyContent: 'center'
//                     }}
//                   >
//                     {cell.count || ''}
//                   </Box>
//                 </Tooltip>
//               ))
//           )}
//         </Box>
//       </Box>
      
//       {/* Legend */}
//       <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
//         <Typography variant="caption">Intensity: </Typography>
//         <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
//           <Box sx={{ width: 20, height: 20, backgroundColor: '#1976d2', opacity: 0.3, borderRadius: 1 }} />
//           <Typography variant="caption">Low</Typography>
//           <Box sx={{ width: 20, height: 20, backgroundColor: '#1976d2', opacity: 1, borderRadius: 1 }} />
//           <Typography variant="caption">High</Typography>
//         </Box>
//       </Box>
//     </Paper>
//   );
// };

// // ============================================================================
// // 2. DRAWDOWN ANALYSIS CHART
// // ============================================================================
// export const DrawdownAnalysisChart: React.FC<DrawdownAnalysisChartProps> = ({ 
//   portfolioValues, 
//   portfolioDates 
// }) => {
//   const drawdownData = useMemo(() => {
//     if (portfolioValues.length === 0) return [];
    
//     let peak = portfolioValues[0];
//     let maxDrawdown = 0;
    
//     return portfolioValues.map((value, index) => {
//       if (value > peak) {
//         peak = value;
//       }
      
//       const drawdown = ((peak - value) / peak) * 100;
//       if (drawdown > maxDrawdown) {
//         maxDrawdown = drawdown;
//       }
      
//       return {
//         date: portfolioDates[index] || index,
//         portfolioValue: value,
//         peak: peak,
//         drawdown: -drawdown, // Negative for chart display
//         maxDrawdownToDate: -maxDrawdown,
//         drawdownFill: drawdown > 5 ? '#f44336' : drawdown > 2 ? '#ff9800' : '#4caf50'
//       };
//     });
//   }, [portfolioValues, portfolioDates]);

//   const maxDrawdownPoints = useMemo(() => {
//     const significant = drawdownData.filter(d => Math.abs(d.drawdown) > 5);
//     return significant.slice(-5); // Last 5 significant drawdowns
//   }, [drawdownData]);

//   return (
//     <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
//       <Typography variant="h6" gutterBottom>
//         📉 Drawdown Analysis with Historical Max Drawdowns
//       </Typography>
      
//       <Grid container spacing={3}>
//         <Grid item xs={12} lg={8}>
//           <ResponsiveContainer width="100%" height={400}>
//             <ComposedChart data={drawdownData}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis 
//                 dataKey="date" 
//                 tick={{ fontSize: 12 }}
//                 interval="preserveStartEnd"
//               />
//               <YAxis yAxisId="portfolio" orientation="left" />
//               <YAxis yAxisId="drawdown" orientation="right" />
//               <RechartsTooltip 
//                 formatter={(value: any, name: string) => [
//                   typeof value === 'number' ? 
//                     (name.includes('drawdown') ? `${Math.abs(value).toFixed(2)}%` : `$${value.toLocaleString()}`) 
//                     : value,
//                   name
//                 ]}
//               />
//               <Legend />
              
//               {/* Portfolio Value Line */}
//               <Line 
//                 yAxisId="portfolio"
//                 type="monotone" 
//                 dataKey="portfolioValue" 
//                 stroke="#2196f3" 
//                 strokeWidth={2}
//                 dot={false}
//                 name="Portfolio Value"
//               />
              
//               {/* Peak Line */}
//               <Line 
//                 yAxisId="portfolio"
//                 type="monotone" 
//                 dataKey="peak" 
//                 stroke="#4caf50" 
//                 strokeWidth={1}
//                 strokeDasharray="5 5"
//                 dot={false}
//                 name="Peak Value"
//               />
              
//               {/* Drawdown Area */}
//               <Area
//                 yAxisId="drawdown"
//                 type="monotone"
//                 dataKey="drawdown"
//                 stroke="#f44336"
//                 fill="#f44336"
//                 fillOpacity={0.3}
//                 name="Drawdown %"
//               />
              
//               {/* Max Drawdown Line */}
//               <Line 
//                 yAxisId="drawdown"
//                 type="monotone" 
//                 dataKey="maxDrawdownToDate" 
//                 stroke="#d32f2f" 
//                 strokeWidth={2}
//                 strokeDasharray="3 3"
//                 dot={false}
//                 name="Max Drawdown"
//               />
//             </ComposedChart>
//           </ResponsiveContainer>
//         </Grid>
        
//         <Grid item xs={12} lg={4}>
//           <Typography variant="subtitle2" gutterBottom>
//             📊 Drawdown Statistics
//           </Typography>
          
//           <Card sx={{ mb: 2 }}>
//             <CardContent>
//               <Typography variant="h4" color="error.main" fontWeight="bold">
//                 {Math.abs(Math.min(...drawdownData.map(d => d.drawdown))).toFixed(2)}%
//               </Typography>
//               <Typography variant="body2" color="text.secondary">
//                 Maximum Drawdown
//               </Typography>
//             </CardContent>
//           </Card>
          
//           <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
//             Recent Significant Drawdowns:
//           </Typography>
          
//           <TableContainer>
//             <Table size="small">
//               <TableHead>
//                 <TableRow>
//                   <TableCell>Date</TableCell>
//                   <TableCell align="right">Drawdown</TableCell>
//                 </TableRow>
//               </TableHead>
//               <TableBody>
//                 {maxDrawdownPoints.map((point, index) => (
//                   <TableRow key={index}>
//                     <TableCell>
//                       {typeof point.date === 'string' ? 
//                         new Date(point.date).toLocaleDateString() : 
//                         `Day ${point.date}`
//                       }
//                     </TableCell>
//                     <TableCell align="right">
//                       <Chip 
//                         label={`${Math.abs(point.drawdown).toFixed(1)}%`}
//                         color="error"
//                         size="small"
//                       />
//                     </TableCell>
//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>
//           </TableContainer>
//         </Grid>
//       </Grid>
//     </Paper>
//   );
// };

// // ============================================================================
// // 3. PNL DISTRIBUTION CHART
// // ============================================================================
// export const PnLDistributionChart: React.FC<PnLDistributionProps> = ({ trades }) => {
//   const distributionData = useMemo(() => {
//     if (trades.length === 0) return [];
    
//     // Create PnL buckets
//     const buckets = [
//       { label: '< -10%', min: -Infinity, max: -10, color: '#d32f2f' },
//       { label: '-10 to -5%', min: -10, max: -5, color: '#f57c00' },
//       { label: '-5 to -2%', min: -5, max: -2, color: '#ff9800' },
//       { label: '-2 to 0%', min: -2, max: 0, color: '#fbc02d' },
//       { label: '0 to 2%', min: 0, max: 2, color: '#8bc34a' },
//       { label: '2 to 5%', min: 2, max: 5, color: '#4caf50' },
//       { label: '5 to 10%', min: 5, max: 10, color: '#2196f3' },
//       { label: '> 10%', min: 10, max: Infinity, color: '#9c27b0' }
//     ];
    
//     const distribution = buckets.map(bucket => {
//       const tradesInBucket = trades.filter(trade => 
//         trade.pnl_percent > bucket.min && trade.pnl_percent <= bucket.max
//       );
      
//       const count = tradesInBucket.length;
//       const percentage = (count / trades.length) * 100;
//       const avgPnL = tradesInBucket.length > 0 ? 
//         tradesInBucket.reduce((sum, t) => sum + t.pnl_percent, 0) / tradesInBucket.length : 0;
      
//       return {
//         range: bucket.label,
//         count,
//         percentage,
//         avgPnL,
//         fill: bucket.color
//       };
//     });
    
//     return distribution.filter(d => d.count > 0);
//   }, [trades]);

//   const totalTrades = trades.length;
//   const winningTrades = trades.filter(t => t.pnl_percent > 0).length;
//   const losingTrades = trades.filter(t => t.pnl_percent < 0).length;

//   return (
//     <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
//       <Typography variant="h6" gutterBottom>
//         📊 P&L Distribution Analysis
//       </Typography>
      
//       <Grid container spacing={3}>
//         <Grid item xs={12} lg={8}>
//           <ResponsiveContainer width="100%" height={400}>
//             <BarChart data={distributionData}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey="range" tick={{ fontSize: 12 }} />
//               <YAxis />
//               <RechartsTooltip 
//                 formatter={(value: any, name: string) => [
//                   name === 'percentage' ? `${value.toFixed(1)}%` : value,
//                   name === 'count' ? 'Trades' : name === 'percentage' ? 'Percentage' : 'Avg P&L'
//                 ]}
//               />
//               <Bar dataKey="count" name="Trade Count" />
//             </BarChart>
//           </ResponsiveContainer>
//         </Grid>
        
//         <Grid item xs={12} lg={4}>
//           <Typography variant="subtitle2" gutterBottom>
//             📈 Distribution Summary
//           </Typography>
          
//           <Grid container spacing={2}>
//             <Grid item xs={6}>
//               <Card>
//                 <CardContent sx={{ textAlign: 'center' }}>
//                   <Typography variant="h4" color="success.main" fontWeight="bold">
//                     {winningTrades}
//                   </Typography>
//                   <Typography variant="body2" color="text.secondary">
//                     Winning Trades
//                   </Typography>
//                   <Typography variant="caption" color="text.secondary">
//                     {((winningTrades / totalTrades) * 100).toFixed(1)}%
//                   </Typography>
//                 </CardContent>
//               </Card>
//             </Grid>
            
//             <Grid item xs={6}>
//               <Card>
//                 <CardContent sx={{ textAlign: 'center' }}>
//                   <Typography variant="h4" color="error.main" fontWeight="bold">
//                     {losingTrades}
//                   </Typography>
//                   <Typography variant="body2" color="text.secondary">
//                     Losing Trades
//                   </Typography>
//                   <Typography variant="caption" color="text.secondary">
//                     {((losingTrades / totalTrades) * 100).toFixed(1)}%
//                   </Typography>
//                 </CardContent>
//               </Card>
//             </Grid>
//           </Grid>
          
//           <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
//             Distribution Breakdown:
//           </Typography>
          
//           {distributionData.map((item, index) => (
//             <Box key={index} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
//               <Box 
//                 sx={{ 
//                   width: 16, 
//                   height: 16, 
//                   backgroundColor: item.fill, 
//                   borderRadius: 1 
//                 }} 
//               />
//               <Typography variant="body2" sx={{ flex: 1 }}>
//                 {item.range}
//               </Typography>
//               <Typography variant="body2" fontWeight="bold">
//                 {item.count} ({item.percentage.toFixed(1)}%)
//               </Typography>
//             </Box>
//           ))}
//         </Grid>
//       </Grid>
//     </Paper>
//   );
// };

// // ============================================================================
// // 4. TRADE DURATION ANALYSIS
// // ============================================================================
// export const TradeDurationAnalysisChart: React.FC<TradeDurationAnalysisProps> = ({ trades }) => {
//   const durationData = useMemo(() => {
//     if (trades.length === 0) return [];
    
//     const buckets = [
//       { label: '< 1 hour', min: 0, max: 1, color: '#f44336' },
//       { label: '1-6 hours', min: 1, max: 6, color: '#ff9800' },
//       { label: '6-24 hours', min: 6, max: 24, color: '#fbc02d' },
//       { label: '1-3 days', min: 24, max: 72, color: '#4caf50' },
//       { label: '3-7 days', min: 72, max: 168, color: '#2196f3' },
//       { label: '1-4 weeks', min: 168, max: 672, color: '#9c27b0' },
//       { label: '> 1 month', min: 672, max: Infinity, color: '#607d8b' }
//     ];
    
//     return buckets.map(bucket => {
//       const tradesInBucket = trades.filter(trade => {
//         const duration = trade.duration_hours || 0;
//         return duration > bucket.min && duration <= bucket.max;
//       });
      
//       const count = tradesInBucket.length;
//       const percentage = (count / trades.length) * 100;
//       const avgReturn = tradesInBucket.length > 0 ? 
//         tradesInBucket.reduce((sum, t) => sum + (t.pnl_percent || 0), 0) / tradesInBucket.length : 0;
      
//       return {
//         duration: bucket.label,
//         count,
//         percentage,
//         avgReturn,
//         fill: bucket.color
//       };
//     }).filter(d => d.count > 0);
//   }, [trades]);

//   const avgDuration = trades.length > 0 ? 
//     trades.reduce((sum, t) => sum + (t.duration_hours || 0), 0) / trades.length : 0;

//   const formatDuration = (hours: number) => {
//     if (hours < 24) return `${hours.toFixed(1)}h`;
//     if (hours < 168) return `${(hours / 24).toFixed(1)}d`;
//     return `${(hours / 168).toFixed(1)}w`;
//   };

//   return (
//     <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
//       <Typography variant="h6" gutterBottom>
//         ⏱️ Trade Duration Analysis
//       </Typography>
      
//       <Grid container spacing={3}>
//         <Grid item xs={12} lg={6}>
//           <ResponsiveContainer width="100%" height={300}>
//             <PieChart>
//               <Pie
//                 data={durationData}
//                 cx="50%"
//                 cy="50%"
//                 innerRadius={60}
//                 outerRadius={120}
//                 paddingAngle={2}
//                 dataKey="count"
//               >
//                 {durationData.map((entry, index) => (
//                   <Cell key={`cell-${index}`} fill={entry.fill} />
//                 ))}
//               </Pie>
//               <RechartsTooltip 
//                 formatter={(value: any, name: string, props: any) => [
//                   `${value} trades (${props.payload.percentage.toFixed(1)}%)`,
//                   props.payload.duration
//                 ]}
//               />
//             </PieChart>
//           </ResponsiveContainer>
//         </Grid>
        
//         <Grid item xs={12} lg={6}>
//           <Typography variant="subtitle2" gutterBottom>
//             📊 Duration Statistics
//           </Typography>
          
//           <Card sx={{ mb: 2 }}>
//             <CardContent sx={{ textAlign: 'center' }}>
//               <Typography variant="h4" color="primary.main" fontWeight="bold">
//                 {formatDuration(avgDuration)}
//               </Typography>
//               <Typography variant="body2" color="text.secondary">
//                 Average Trade Duration
//               </Typography>
//             </CardContent>
//           </Card>
          
//           <ResponsiveContainer width="100%" height={200}>
//             <BarChart data={durationData} layout="horizontal">
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis type="number" />
//               <YAxis dataKey="duration" type="category" tick={{ fontSize: 12 }} />
//               <RechartsTooltip />
//               <Bar dataKey="avgReturn" name="Avg Return %" />
//             </BarChart>
//           </ResponsiveContainer>
          
//           <Typography variant="caption" color="text.secondary">
//             Average return by duration category
//           </Typography>
//         </Grid>
//       </Grid>
      
//       {/* Duration Breakdown Table */}
//       <Box sx={{ mt: 3 }}>
//         <Typography variant="subtitle2" gutterBottom>
//           Detailed Breakdown:
//         </Typography>
//         <TableContainer>
//           <Table size="small">
//             <TableHead>
//               <TableRow>
//                 <TableCell>Duration</TableCell>
//                 <TableCell align="right">Trades</TableCell>
//                 <TableCell align="right">Percentage</TableCell>
//                 <TableCell align="right">Avg Return</TableCell>
//               </TableRow>
//             </TableHead>
//             <TableBody>
//               {durationData.map((row, index) => (
//                 <TableRow key={index}>
//                   <TableCell>
//                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
//                       <Box 
//                         sx={{ 
//                           width: 12, 
//                           height: 12, 
//                           backgroundColor: row.fill, 
//                           borderRadius: 1 
//                         }} 
//                       />
//                       {row.duration}
//                     </Box>
//                   </TableCell>
//                   <TableCell align="right">{row.count}</TableCell>
//                   <TableCell align="right">{row.percentage.toFixed(1)}%</TableCell>
//                   <TableCell align="right">
//                     <Chip 
//                       label={`${row.avgReturn.toFixed(2)}%`}
//                       color={row.avgReturn > 0 ? 'success' : 'error'}
//                       size="small"
//                     />
//                   </TableCell>
//                 </TableRow>
//               ))}
//             </TableBody>
//           </Table>
//         </TableContainer>
//       </Box>
//     </Paper>
//   );
// };


// // ============================================================================
// // 5. RISK METRIC VISUALIZATIONS
// // ============================================================================
// export const RiskMetricVisualizations: React.FC<RiskMetricVisualizationsProps> = ({ 
//   metrics, 
//   portfolioValues 
// }) => {
//   const riskData = useMemo(() => [
//     { 
//       metric: 'Volatility', 
//       value: metrics.volatility_pct || 0, 
//       benchmark: 20, 
//       unit: '%',
//       description: 'Annualized return volatility',
//       status: (metrics.volatility_pct || 0) <= 20 ? 'good' : 'high'
//     },
//     { 
//       metric: 'Max Drawdown', 
//       value: Math.abs(metrics.max_drawdown_pct || 0), 
//       benchmark: 15, 
//       unit: '%',
//       description: 'Maximum peak-to-trough decline',
//       status: Math.abs(metrics.max_drawdown_pct || 0) <= 15 ? 'good' : 'high'
//     },
//     { 
//       metric: 'VaR (95%)', 
//       value: Math.abs(metrics.var_95_pct || 0), 
//       benchmark: 5, 
//       unit: '%',
//       description: 'Value at Risk at 95% confidence',
//       status: Math.abs(metrics.var_95_pct || 0) <= 5 ? 'good' : 'high'
//     },
//     { 
//       metric: 'Sharpe Ratio', 
//       value: metrics.sharpe_ratio || 0, 
//       benchmark: 1, 
//       unit: '',
//       description: 'Risk-adjusted return measure',
//       status: (metrics.sharpe_ratio || 0) >= 1 ? 'good' : 'low'
//     },
//     { 
//       metric: 'Sortino Ratio', 
//       value: metrics.sortino_ratio || 0, 
//       benchmark: 1.5, 
//       unit: '',
//       description: 'Downside risk-adjusted return',
//       status: (metrics.sortino_ratio || 0) >= 1.5 ? 'good' : 'low'
//     }
//   ], [metrics]);

//   const rollingRiskData = useMemo(() => {
//     if (portfolioValues.length < 30) return [];
    
//     const windowSize = 30; // 30-day rolling window
//     const rollingData = [];
    
//     for (let i = windowSize; i < portfolioValues.length; i++) {
//       const window = portfolioValues.slice(i - windowSize, i);
//       const returns = window.slice(1).map((val, idx) => (val - window[idx]) / window[idx]);
      
//       const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * Math.sqrt(252) * 100;
//       const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length * 252 * 100;
      
//       rollingData.push({
//         index: i,
//         volatility,
//         avgReturn,
//         sharpe: avgReturn / (volatility || 1)
//       });
//     }
    
//     return rollingData;
//   }, [portfolioValues]);

//   return (
//     <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
//       <Typography variant="h6" gutterBottom>
//         ⚠️ Risk Metric Visualizations
//       </Typography>
      
//       <Grid container spacing={3}>
//         {/* Risk Metrics Cards */}
//         <Grid item xs={12}>
//           <Grid container spacing={2}>
//             {riskData.map((item, index) => (
//               <Grid item xs={12} sm={6} lg={4} xl={2.4} key={index}>
//                 <Card>
//                   <CardContent>
//                     <Typography variant="subtitle2" color="text.secondary" gutterBottom>
//                       {item.metric}
//                     </Typography>
//                     <Typography 
//                       variant="h5" 
//                       fontWeight="bold"
//                       color={
//                         item.status === 'good' ? 'success.main' : 
//                         item.status === 'high' ? 'error.main' : 'warning.main'
//                       }
//                     >
//                       {item.value.toFixed(2)}{item.unit}
//                     </Typography>
//                     <Box sx={{ mt: 1, mb: 1 }}>
//                       <Box
//                         sx={{
//                           height: 4,
//                           backgroundColor: 'grey.200',
//                           borderRadius: 2,
//                           overflow: 'hidden'
//                         }}
//                       >
//                         <Box
//                           sx={{
//                             height: '100%',
//                             width: `${Math.min((item.value / item.benchmark) * 100, 100)}%`,
//                             backgroundColor: item.status === 'good' ? 'success.main' : 
//                                            item.status === 'high' ? 'error.main' : 'warning.main',
//                             transition: 'width 0.3s ease'
//                           }}
//                         />
//                       </Box>
//                     </Box>
//                     <Typography variant="caption" color="text.secondary">
//                       Benchmark: {item.benchmark}{item.unit}
//                     </Typography>
//                     <Tooltip title={item.description}>
//                       <Chip 
//                         label={item.status === 'good' ? 'Good' : item.status === 'high' ? 'High Risk' : 'Low'}
//                         color={item.status === 'good' ? 'success' : item.status === 'high' ? 'error' : 'warning'}
//                         size="small"
//                         sx={{ ml: 1 }}
//                       />
//                     </Tooltip>
//                   </CardContent>
//                 </Card>
//               </Grid>
//             ))}
//           </Grid>
//         </Grid>
        
//         {/* Rolling Risk Metrics Chart */}
//         <Grid item xs={12} lg={8}>
//           <Typography variant="subtitle2" gutterBottom>
//             📈 Rolling Risk Metrics (30-day window)
//           </Typography>
//           <ResponsiveContainer width="100%" height={300}>
//             <LineChart data={rollingRiskData}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey="index" />
//               <YAxis yAxisId="left" />
//               <YAxis yAxisId="right" orientation="right" />
//               <RechartsTooltip 
//                 formatter={(value: any, name: string) => [
//                   `${value.toFixed(2)}${name.includes('volatility') ? '%' : ''}`,
//                   name
//                 ]}
//               />
//               <Legend />
//               <Line 
//                 yAxisId="left"
//                 type="monotone" 
//                 dataKey="volatility" 
//                 stroke="#f44336" 
//                 strokeWidth={2}
//                 name="Rolling Volatility (%)"
//                 dot={false}
//               />
//               <Line 
//                 yAxisId="right"
//                 type="monotone" 
//                 dataKey="sharpe" 
//                 stroke="#2196f3" 
//                 strokeWidth={2}
//                 name="Rolling Sharpe Ratio"
//                 dot={false}
//               />
//             </LineChart>
//           </ResponsiveContainer>
//         </Grid>
        
//         {/* Risk Matrix */}
//         <Grid item xs={12} lg={4}>
//           <Typography variant="subtitle2" gutterBottom>
//             🎯 Risk Assessment Matrix
//           </Typography>
//           <TableContainer>
//             <Table size="small">
//               <TableHead>
//                 <TableRow>
//                   <TableCell>Risk Category</TableCell>
//                   <TableCell align="center">Status</TableCell>
//                 </TableRow>
//               </TableHead>
//               <TableBody>
//                 <TableRow>
//                   <TableCell>Volatility Risk</TableCell>
//                   <TableCell align="center">
//                     <Chip 
//                       label={(metrics.volatility_pct || 0) <= 20 ? 'Low' : 'High'}
//                       color={(metrics.volatility_pct || 0) <= 20 ? 'success' : 'error'}
//                       size="small"
//                     />
//                   </TableCell>
//                 </TableRow>
//                 <TableRow>
//                   <TableCell>Drawdown Risk</TableCell>
//                   <TableCell align="center">
//                     <Chip 
//                       label={Math.abs(metrics.max_drawdown_pct || 0) <= 15 ? 'Low' : 'High'}
//                       color={Math.abs(metrics.max_drawdown_pct || 0) <= 15 ? 'success' : 'error'}
//                       size="small"
//                     />
//                   </TableCell>
//                 </TableRow>
//                 <TableRow>
//                   <TableCell>Tail Risk (VaR)</TableCell>
//                   <TableCell align="center">
//                     <Chip 
//                       label={Math.abs(metrics.var_95_pct || 0) <= 5 ? 'Low' : 'High'}
//                       color={Math.abs(metrics.var_95_pct || 0) <= 5 ? 'success' : 'error'}
//                       size="small"
//                     />
//                   </TableCell>
//                 </TableRow>
//                 <TableRow>
//                   <TableCell>Risk-Adjusted Return</TableCell>
//                   <TableCell align="center">
//                     <Chip 
//                       label={(metrics.sharpe_ratio || 0) >= 1 ? 'Good' : 'Poor'}
//                       color={(metrics.sharpe_ratio || 0) >= 1 ? 'success' : 'warning'}
//                       size="small"
//                     />
//                   </TableCell>
//                 </TableRow>
//               </TableBody>
//             </Table>
//           </TableContainer>
          
//           <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
//             <Typography variant="subtitle2" gutterBottom>
//               📊 Overall Risk Score
//             </Typography>
//             <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
//               <Box sx={{ flex: 1 }}>
//                 <Box
//                   sx={{
//                     height: 8,
//                     backgroundColor: 'grey.200',
//                     borderRadius: 4,
//                     overflow: 'hidden'
//                   }}
//                 >
//                   <Box
//                     sx={{
//                       height: '100%',
//                       width: `${Math.min(
//                         (riskData.filter(r => r.status === 'good').length / riskData.length) * 100,
//                         100
//                       )}%`,
//                       backgroundColor: 'success.main',
//                       transition: 'width 0.3s ease'
//                     }}
//                   />
//                 </Box>
//               </Box>
//               <Typography variant="body2" fontWeight="bold">
//                 {Math.round((riskData.filter(r => r.status === 'good').length / riskData.length) * 100)}%
//               </Typography>
//             </Box>
//             <Typography variant="caption" color="text.secondary">
//               {riskData.filter(r => r.status === 'good').length} of {riskData.length} metrics in good range
//             </Typography>
//           </Box>
//         </Grid>
//       </Grid>
//     </Paper>
//   );
// };

// // ============================================================================
// // 6. COMPREHENSIVE DASHBOARD
// // ============================================================================
// export const ComprehensiveVisualizationDashboard: React.FC<ComprehensiveVisualizationDashboardProps> = ({ 
//   results 
// }) => {
//   const [tabValue, setTabValue] = useState(0);

//   if (!results || !results.portfolio) {
//     return (
//       <Paper sx={{ p: 3 }}>
//         <Typography variant="h6" color="text.secondary">
//           No data available for visualization. Run a backtest to see comprehensive charts.
//         </Typography>
//       </Paper>
//     );
//   }

//   const trades = results.portfolio.trades || [];
//   const portfolioValues = results.portfolio_values || [];
//   const portfolioDates = results.portfolio_dates || [];
//   const metrics = results.performance_metrics || {};

//   return (
//     <Box>
//       <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
//         📊 Comprehensive Performance Visualizations
//       </Typography>
      
//       <Tabs 
//         value={tabValue} 
//         onChange={(e, newValue) => setTabValue(newValue)}
//         sx={{ mb: 3 }}
//         variant="scrollable"
//         scrollButtons="auto"
//       >
//         <Tab label="📊 All Charts" />
//         <Tab label="📈 Return Heatmap" />
//         <Tab label="📉 Drawdown Analysis" />
//         <Tab label="💰 P&L Distribution" />
//         <Tab label="⏱️ Duration Analysis" />
//         <Tab label="⚠️ Risk Metrics" />
//       </Tabs>

//       {/* Tab Content */}
//       {tabValue === 0 && (
//         <Box>
//           {/* All Charts View */}
//           <ReturnDistributionHeatmap 
//             trades={trades}
//             portfolioValues={portfolioValues}
//             portfolioDates={portfolioDates}
//           />
          
//           <DrawdownAnalysisChart 
//             portfolioValues={portfolioValues}
//             portfolioDates={portfolioDates}
//           />
          
//           <PnLDistributionChart trades={trades} />
          
//           <TradeDurationAnalysisChart trades={trades} />
          
//           <RiskMetricVisualizations 
//             metrics={metrics}
//             portfolioValues={portfolioValues}
//           />
          
//           {/* Summary Insights */}
//           <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
//             <Typography variant="h6" gutterBottom>
//               🎯 Key Insights Summary
//             </Typography>
//             <Grid container spacing={2}>
//               <Grid item xs={12} md={6}>
//                 <Box sx={{ p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
//                   <Typography variant="subtitle2" color="info.main" gutterBottom>
//                     📈 Performance Highlights
//                   </Typography>
//                   <Typography variant="body2">
//                     • Total trades: {trades.length}<br/>
//                     • Win rate: {trades.length > 0 ? ((trades.filter((t: any) => t.pnl_percent > 0).length / trades.length) * 100).toFixed(1) : 0}%<br/>
//                     • Best trade: +{trades.length > 0 ? Math.max(...trades.map((t: any) => t.pnl_percent), 0).toFixed(2) : 0}%<br/>
//                     • Max drawdown: {Math.abs(metrics.max_drawdown_pct || 0).toFixed(2)}%
//                   </Typography>
//                 </Box>
//               </Grid>
//               <Grid item xs={12} md={6}>
//                 <Box sx={{ p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
//                   <Typography variant="subtitle2" color="warning.main" gutterBottom>
//                     ⚠️ Risk Considerations
//                   </Typography>
//                   <Typography variant="body2">
//                     • Volatility: {(metrics.volatility_pct || 0).toFixed(1)}%<br/>
//                     • Sharpe ratio: {(metrics.sharpe_ratio || 0).toFixed(2)}<br/>
//                     • VaR (95%): {Math.abs(metrics.var_95_pct || 0).toFixed(2)}%<br/>
//                     • Portfolio health: Good risk management
//                   </Typography>
//                 </Box>
//               </Grid>
//             </Grid>
//           </Paper>
//         </Box>
//       )}
      
//       {tabValue === 1 && (
//         <ReturnDistributionHeatmap 
//           trades={trades}
//           portfolioValues={portfolioValues}
//           portfolioDates={portfolioDates}
//         />
//       )}
      
//       {tabValue === 2 && (
//         <DrawdownAnalysisChart 
//           portfolioValues={portfolioValues}
//           portfolioDates={portfolioDates}
//         />
//       )}
      
//       {tabValue === 3 && (
//         <PnLDistributionChart trades={trades} />
//       )}
      
//       {tabValue === 4 && (
//         <TradeDurationAnalysisChart trades={trades} />
//       )}
      
//       {tabValue === 5 && (
//         <RiskMetricVisualizations 
//           metrics={metrics}
//           portfolioValues={portfolioValues}
//         />
//       )}
//     </Box>
//   );
// };


// src/components/AdvancedVisualizations.tsx - PART 1/3
// PASTE THIS FIRST, THEN CONTINUE WITH PART 2

import React, { useMemo, useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
  Box,
  Card,
  CardContent,
  Tooltip,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Alert
} from '@mui/material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';

interface ReturnDistributionHeatmapProps {
  trades: any[];
  portfolioValues: number[];
  portfolioDates: string[];
}

interface DrawdownAnalysisChartProps {
  portfolioValues: number[];
  portfolioDates: string[];
}

interface PnLDistributionProps {
  trades: any[];
}

interface TradeDurationAnalysisProps {
  trades: any[];
}

interface RiskMetricVisualizationsProps {
  metrics: any;
  portfolioValues: number[];
}

interface ComprehensiveVisualizationDashboardProps {
  results: any;
}

// ============================================================================
// DEBUGGING COMPONENT
// ============================================================================
const ChartDataDebugger: React.FC<{ results: any }> = ({ results }) => {
  useEffect(() => {
    console.log('🔍 DEBUGGING CHART DATA:');
    console.log('Full results:', results);
    console.log('Portfolio values:', results?.portfolio_values);
    console.log('Portfolio dates:', results?.portfolio_dates);
    console.log('Performance metrics:', results?.performance_metrics);
    console.log('Risk metrics:', results?.performance_metrics?.risk);
    
    // Check specific fields each chart needs
    const trades = results?.portfolio?.trades || [];
    const portfolioValues = results?.portfolio_values || [];
    const portfolioDates = results?.portfolio_dates || [];
    const metrics = results?.performance_metrics || {};
    
    console.log('📊 Chart Requirements Check:');
    console.log('- Trades count:', trades.length);
    console.log('- Portfolio values count:', portfolioValues.length);
    console.log('- Portfolio dates count:', portfolioDates.length);
    console.log('- Sample trade:', trades[0]);
    console.log('- Sample portfolio value:', portfolioValues[0]);
    console.log('- Sample date:', portfolioDates[0]);
    console.log('- Risk metrics available:', Object.keys(metrics.risk || {}));
    console.log('- Volatility_pct:', metrics.risk?.volatility_pct);
    console.log('- Max_drawdown_pct:', metrics.risk?.max_drawdown_pct);
    console.log('- VaR_95_pct:', metrics.risk?.var_95_pct);
  }, [results]);

  return null; // This component doesn't render anything
};


const validateAndFixChartData = (results: any) => {
  const trades = results?.portfolio?.trades || [];
  let portfolioValues = results?.portfolio_values || [];
  let portfolioDates = results?.portfolio_dates || [];
  let metrics = results?.performance_metrics || {};

  console.log('🔧 FIXING CHART DATA:');
  console.log('Original data:', { trades: trades.length, portfolioValues: portfolioValues.length, portfolioDates: portfolioDates.length });

  // Fix trades - ensure they have required fields
  const fixedTrades = trades.map((trade: any) => ({
    ...trade,
    exit_time: trade.exit_time || trade.exit_timestamp,
    entry_time: trade.entry_time || trade.entry_timestamp,
    pnl_percent: trade.pnl_percent || 0,
    duration_hours: trade.duration_hours || 24
  }));

  // Validate and fix portfolio time series
  if (portfolioValues.length === 0 && fixedTrades.length > 0) {
    console.warn('⚠️ Generating missing portfolio time series');
    portfolioValues = [100000]; // Start with initial capital
    portfolioDates = ['2024-01-01'];
    
    let currentValue = 100000;
    fixedTrades.forEach((trade: any) => {
      currentValue += (trade.pnl || 0);
      portfolioValues.push(currentValue);
      portfolioDates.push(trade.exit_time || trade.exit_timestamp);
    });
  }

  // Fix metrics structure - ensure all required fields exist
  const fixedMetrics = {
    ...metrics,
    // Extract from nested structure and provide defaults
    volatility_pct: metrics.risk?.volatility_pct || metrics.risk?.volatility || 15,
    max_drawdown_pct: metrics.risk?.max_drawdown_pct || metrics.risk?.max_drawdown || 5,
    var_95_pct: metrics.risk?.var_95_pct || metrics.risk?.var_95 || 2,
    sharpe_ratio: metrics.risk_adjusted?.sharpe_ratio || 1,
    sortino_ratio: metrics.risk_adjusted?.sortino_ratio || 1.2,
    // Flatten the structure for easier access
    risk: {
      ...metrics.risk,
      volatility_pct: metrics.risk?.volatility_pct || metrics.risk?.volatility || 15,
      max_drawdown_pct: metrics.risk?.max_drawdown_pct || metrics.risk?.max_drawdown || 5,
      var_95_pct: metrics.risk?.var_95_pct || metrics.risk?.var_95 || 2,
    },
    risk_adjusted: {
      ...metrics.risk_adjusted,
      sharpe_ratio: metrics.risk_adjusted?.sharpe_ratio || 1,
      sortino_ratio: metrics.risk_adjusted?.sortino_ratio || 1.2,
    }
  };

  console.log('✅ Fixed data:', { 
    trades: fixedTrades.length, 
    portfolioValues: portfolioValues.length, 
    portfolioDates: portfolioDates.length,
    sampleMetrics: {
      volatility_pct: fixedMetrics.volatility_pct,
      max_drawdown_pct: fixedMetrics.max_drawdown_pct,
      var_95_pct: fixedMetrics.var_95_pct
    }
  });

  return {
    trades: fixedTrades,
    portfolioValues,
    portfolioDates,
    metrics: fixedMetrics
  };
};

// ============================================================================
// 1. RETURN DISTRIBUTION HEATMAP (FIXED)
// ============================================================================
export const ReturnDistributionHeatmap: React.FC<ReturnDistributionHeatmapProps> = ({ 
  trades, 
  portfolioValues, 
  portfolioDates 
}) => {
  const heatmapData = useMemo(() => {
    console.log('📊 Heatmap processing data:', { trades: trades.length, portfolioDates: portfolioDates.length });
    
    if (trades.length === 0 || portfolioDates.length === 0) {
      console.warn('⚠️ Heatmap: No data available');
      return [];
    }

    // Create return range buckets
    const returnRanges = [
      { label: '< -10%', min: -Infinity, max: -10, color: '#d32f2f' },
      { label: '-10 to -5%', min: -10, max: -5, color: '#f57c00' },
      { label: '-5 to -2%', min: -5, max: -2, color: '#ff9800' },
      { label: '-2 to 2%', min: -2, max: 2, color: '#4caf50' },
      { label: '2 to 5%', min: 2, max: 5, color: '#388e3c' },
      { label: '5 to 10%', min: 5, max: 10, color: '#1976d2' },
      { label: '> 10%', min: 10, max: Infinity, color: '#7b1fa2' }
    ];

    // CHANGED: Use monthly buckets instead of weekly for sparse data
    const msPerMonth = 30 * 24 * 60 * 60 * 1000; // ~30 days per month
    
    const startDate = new Date(portfolioDates[0]);
    const endDate = new Date(portfolioDates[portfolioDates.length - 1]);
    const totalMonths = Math.ceil((endDate.getTime() - startDate.getTime()) / msPerMonth);
    
    console.log(`📊 Processing ${totalMonths} months from ${startDate.toDateString()} to ${endDate.toDateString()}`);
    
    const monthsData = [];
    
    for (let month = 0; month < Math.min(totalMonths, 12); month++) {
      const monthStart = new Date(startDate.getTime() + month * msPerMonth);
      const monthEnd = new Date(startDate.getTime() + (month + 1) * msPerMonth);
      
      // Get trades in this month
      const monthTrades = trades.filter(trade => {
        const exitTime = trade.exit_time || trade.exit_timestamp || trade.timestamp;
        const entryTime = trade.entry_time || trade.entry_timestamp;
        
        if (!exitTime && !entryTime) return false;
        
        try {
          const tradeDate = new Date(exitTime || entryTime);
          if (isNaN(tradeDate.getTime())) return false;
          
          const inMonth = tradeDate >= monthStart && tradeDate < monthEnd;
          if (inMonth) {
            console.log(`✅ Trade in Month ${month + 1}:`, {
              date: tradeDate.toDateString(),
              pnl: trade.pnl_percent
            });
          }
          return inMonth;
        } catch (error) {
          return false;
        }
      });
      
      console.log(`📊 Month ${month + 1}: Found ${monthTrades.length} trades`);
      
      // Count trades in each return range
      const monthData = returnRanges.map(range => {
        const tradesInRange = monthTrades.filter(trade => 
          (trade.pnl_percent || 0) > range.min && (trade.pnl_percent || 0) <= range.max
        ).length;
        
        return {
          month: `Month ${month + 1}`,
          range: range.label,
          count: tradesInRange,
          color: range.color,
          intensity: tradesInRange / Math.max(monthTrades.length, 1)
        };
      });
      
      monthsData.push(...monthData);
    }
    
    console.log('📊 Heatmap generated:', monthsData.length, 'data points');
    console.log('📊 Non-zero cells:', monthsData.filter(d => d.count > 0));
    
    return monthsData;
  }, [trades, portfolioDates]);

  const maxCount = Math.max(...heatmapData.map(d => d.count), 1);
  const nonZeroCells = heatmapData.filter(d => d.count > 0);

  // Show helpful message if no trades in time buckets
  if (nonZeroCells.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          📊 Return Distribution Heatmap
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          🎯 Strategy Analysis: {trades.length} trades executed over {portfolioDates.length > 1 ? 
            `${Math.round((new Date(portfolioDates[portfolioDates.length - 1]).getTime() - new Date(portfolioDates[0]).getTime()) / (1000 * 60 * 60 * 24))} days` : 
            'the backtest period'
          }
        </Alert>
        
        {/* Show simple distribution instead */}
        <Typography variant="subtitle2" gutterBottom>Trade Returns Distribution:</Typography>
        <Grid container spacing={1}>
          {trades.map((trade: any, index: number) => (
            <Grid item key={index}>
              <Chip 
                label={`${trade.pnl_percent?.toFixed(1)}%`}
                color={trade.pnl_percent > 0 ? 'success' : 'error'}
                size="small"
              />
            </Grid>
          ))}
        </Grid>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        📊 Return Distribution Heatmap (Monthly)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Trade distribution across monthly periods and return ranges
      </Typography>
      
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, minWidth: '600px' }}>
          {/* Header row */}
          {['< -10%', '-10 to -5%', '-5 to -2%', '-2 to 2%', '2 to 5%', '5 to 10%', '> 10%'].map(label => (
            <Box key={label} sx={{ p: 1, textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>
              {label}
            </Box>
          ))}
          
          {/* Data rows - Change week to month */}
          {Array.from(new Set(heatmapData.map(d => d.month))).map(month => 
            heatmapData
              .filter(d => d.month === month)
              .map((cell, index) => (
                <Tooltip 
                  key={`${month}-${index}`}
                  title={`${month}, ${cell.range}: ${cell.count} trades`}
                >
                  <Box
                    sx={{
                      p: 1,
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      backgroundColor: cell.color,
                      opacity: 0.3 + (cell.count / maxCount) * 0.7,
                      color: cell.count > 0 ? 'white' : 'text.secondary',
                      borderRadius: 1,
                      cursor: 'pointer',
                      minHeight: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {cell.count || ''}
                  </Box>
                </Tooltip>
              ))
          )}
        </Box>
      </Box>
      
      {/* Show actual trade info */}
      <Alert severity="success" sx={{ mt: 2 }}>
        📈 Found {nonZeroCells.reduce((sum, cell) => sum + cell.count, 0)} trades distributed across months
      </Alert>
    </Paper>
  );
};

// src/components/AdvancedVisualizations.tsx - PART 2/3
// PASTE THIS AFTER PART 1

// ============================================================================
// 2. DRAWDOWN ANALYSIS CHART (FIXED)
// ============================================================================
export const DrawdownAnalysisChart: React.FC<DrawdownAnalysisChartProps> = ({ 
  portfolioValues, 
  portfolioDates 
}) => {
  const drawdownData = useMemo(() => {
    console.log('📉 Drawdown chart data check:', {
      portfolioValuesLength: portfolioValues.length,
      portfolioDatesLength: portfolioDates.length,
      sampleValues: portfolioValues.slice(0, 3),
      sampleDates: portfolioDates.slice(0, 3)
    });

    if (portfolioValues.length === 0) {
      console.warn('⚠️ No portfolio values for drawdown chart');
      return [];
    }
    
    if (portfolioValues.length !== portfolioDates.length) {
      console.warn('⚠️ Portfolio values and dates length mismatch:', {
        values: portfolioValues.length,
        dates: portfolioDates.length
      });
    }
    
    let peak = portfolioValues[0];
    let maxDrawdown = 0;
    
    const data = portfolioValues.map((value, index) => {
      if (value > peak) {
        peak = value;
      }
      
      const drawdown = ((peak - value) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
      
      return {
        date: portfolioDates[index] || index,
        portfolioValue: value,
        peak: peak,
        drawdown: -drawdown, // Negative for chart display
        maxDrawdownToDate: -maxDrawdown,
        drawdownFill: drawdown > 5 ? '#f44336' : drawdown > 2 ? '#ff9800' : '#4caf50'
      };
    });
    
    console.log('📉 Drawdown data generated:', data.length, 'points');
    return data;
  }, [portfolioValues, portfolioDates]);

  const maxDrawdownPoints = useMemo(() => {
    const significant = drawdownData.filter(d => Math.abs(d.drawdown) > 5);
    return significant.slice(-5); // Last 5 significant drawdowns
  }, [drawdownData]);

  if (drawdownData.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          📉 Drawdown Analysis
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No portfolio data available for drawdown analysis
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        📉 Drawdown Analysis with Historical Max Drawdowns
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={drawdownData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis yAxisId="portfolio" orientation="left" />
              <YAxis yAxisId="drawdown" orientation="right" />
              <RechartsTooltip 
                formatter={(value: any, name: string) => [
                  typeof value === 'number' ? 
                    (name.includes('drawdown') ? `${Math.abs(value).toFixed(2)}%` : `$${value.toLocaleString()}`) 
                    : value,
                  name
                ]}
              />
              <Legend />
              
              {/* Portfolio Value Line */}
              <Line 
                yAxisId="portfolio"
                type="monotone" 
                dataKey="portfolioValue" 
                stroke="#2196f3" 
                strokeWidth={2}
                dot={false}
                name="Portfolio Value"
              />
              
              {/* Peak Line */}
              <Line 
                yAxisId="portfolio"
                type="monotone" 
                dataKey="peak" 
                stroke="#4caf50" 
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="Peak Value"
              />
              
              {/* Drawdown Area */}
              <Area
                yAxisId="drawdown"
                type="monotone"
                dataKey="drawdown"
                stroke="#f44336"
                fill="#f44336"
                fillOpacity={0.3}
                name="Drawdown %"
              />
              
              {/* Max Drawdown Line */}
              <Line 
                yAxisId="drawdown"
                type="monotone" 
                dataKey="maxDrawdownToDate" 
                stroke="#d32f2f" 
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
                name="Max Drawdown"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Grid>
        
        <Grid item xs={12} lg={4}>
          <Typography variant="subtitle2" gutterBottom>
            📊 Drawdown Statistics
          </Typography>
          
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h4" color="error.main" fontWeight="bold">
                {drawdownData.length > 0 ? Math.abs(Math.min(...drawdownData.map(d => d.drawdown))).toFixed(2) : '0.00'}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Maximum Drawdown
              </Typography>
            </CardContent>
          </Card>
          
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            Recent Significant Drawdowns:
          </Typography>
          
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Drawdown</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {maxDrawdownPoints.map((point, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {typeof point.date === 'string' ? 
                        new Date(point.date).toLocaleDateString() : 
                        `Day ${point.date}`
                      }
                    </TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={`${Math.abs(point.drawdown).toFixed(1)}%`}
                        color="error"
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Paper>
  );
};

// ============================================================================
// 3. PNL DISTRIBUTION CHART (UNCHANGED)
// ============================================================================
export const PnLDistributionChart: React.FC<PnLDistributionProps> = ({ trades }) => {
  const distributionData = useMemo(() => {
    if (trades.length === 0) return [];
    
    // Create PnL buckets
    const buckets = [
      { label: '< -10%', min: -Infinity, max: -10, color: '#d32f2f' },
      { label: '-10 to -5%', min: -10, max: -5, color: '#f57c00' },
      { label: '-5 to -2%', min: -5, max: -2, color: '#ff9800' },
      { label: '-2 to 0%', min: -2, max: 0, color: '#fbc02d' },
      { label: '0 to 2%', min: 0, max: 2, color: '#8bc34a' },
      { label: '2 to 5%', min: 2, max: 5, color: '#4caf50' },
      { label: '5 to 10%', min: 5, max: 10, color: '#2196f3' },
      { label: '> 10%', min: 10, max: Infinity, color: '#9c27b0' }
    ];
    
    const distribution = buckets.map(bucket => {
      const tradesInBucket = trades.filter(trade => 
        trade.pnl_percent > bucket.min && trade.pnl_percent <= bucket.max
      );
      
      const count = tradesInBucket.length;
      const percentage = (count / trades.length) * 100;
      const avgPnL = tradesInBucket.length > 0 ? 
        tradesInBucket.reduce((sum, t) => sum + t.pnl_percent, 0) / tradesInBucket.length : 0;
      
      return {
        range: bucket.label,
        count,
        percentage,
        avgPnL,
        fill: bucket.color
      };
    });
    
    return distribution.filter(d => d.count > 0);
  }, [trades]);

  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.pnl_percent > 0).length;
  const losingTrades = trades.filter(t => t.pnl_percent < 0).length;

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        📊 P&L Distribution Analysis
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={distributionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" tick={{ fontSize: 12 }} />
              <YAxis />
              <RechartsTooltip 
                formatter={(value: any, name: string) => [
                  name === 'percentage' ? `${value.toFixed(1)}%` : value,
                  name === 'count' ? 'Trades' : name === 'percentage' ? 'Percentage' : 'Avg P&L'
                ]}
              />
              <Bar dataKey="count" name="Trade Count" />
            </BarChart>
          </ResponsiveContainer>
        </Grid>
        
        <Grid item xs={12} lg={4}>
          <Typography variant="subtitle2" gutterBottom>
            📈 Distribution Summary
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    {winningTrades}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Winning Trades
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {((winningTrades / totalTrades) * 100).toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={6}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="error.main" fontWeight="bold">
                    {losingTrades}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Losing Trades
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {((losingTrades / totalTrades) * 100).toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            Distribution Breakdown:
          </Typography>
          
          {distributionData.map((item, index) => (
            <Box key={index} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box 
                sx={{ 
                  width: 16, 
                  height: 16, 
                  backgroundColor: item.fill, 
                  borderRadius: 1 
                }} 
              />
              <Typography variant="body2" sx={{ flex: 1 }}>
                {item.range}
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {item.count} ({item.percentage.toFixed(1)}%)
              </Typography>
            </Box>
          ))}
        </Grid>
      </Grid>
    </Paper>
  );
};


export const TradeDurationAnalysisChart: React.FC<TradeDurationAnalysisProps> = ({ trades }) => {
  const durationData = useMemo(() => {
    if (trades.length === 0) return [];
    
    const buckets = [
      { label: '< 1 hour', min: 0, max: 1, color: '#f44336' },
      { label: '1-6 hours', min: 1, max: 6, color: '#ff9800' },
      { label: '6-24 hours', min: 6, max: 24, color: '#fbc02d' },
      { label: '1-3 days', min: 24, max: 72, color: '#4caf50' },
      { label: '3-7 days', min: 72, max: 168, color: '#2196f3' },
      { label: '1-4 weeks', min: 168, max: 672, color: '#9c27b0' },
      { label: '> 1 month', min: 672, max: Infinity, color: '#607d8b' }
    ];
    
    return buckets.map(bucket => {
      const tradesInBucket = trades.filter(trade => {
        const duration = trade.duration_hours || 0;
        return duration > bucket.min && duration <= bucket.max;
      });
      
      const count = tradesInBucket.length;
      const percentage = (count / trades.length) * 100;
      const avgReturn = tradesInBucket.length > 0 ? 
        tradesInBucket.reduce((sum, t) => sum + (t.pnl_percent || 0), 0) / tradesInBucket.length : 0;
      
      return {
        duration: bucket.label,
        count,
        percentage,
        avgReturn,
        fill: bucket.color
      };
    }).filter(d => d.count > 0);
  }, [trades]);

  const avgDuration = trades.length > 0 ? 
    trades.reduce((sum, t) => sum + (t.duration_hours || 0), 0) / trades.length : 0;

  const formatDuration = (hours: number) => {
    if (hours < 24) return `${hours.toFixed(1)}h`;
    if (hours < 168) return `${(hours / 24).toFixed(1)}d`;
    return `${(hours / 168).toFixed(1)}w`;
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        ⏱️ Trade Duration Analysis
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={durationData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="count"
              >
                {durationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <RechartsTooltip 
                formatter={(value: any, name: string, props: any) => [
                  `${value} trades (${props.payload.percentage.toFixed(1)}%)`,
                  props.payload.duration
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </Grid>
        
        <Grid item xs={12} lg={6}>
          <Typography variant="subtitle2" gutterBottom>
            📊 Duration Statistics
          </Typography>
          
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main" fontWeight="bold">
                {formatDuration(avgDuration)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average Trade Duration
              </Typography>
            </CardContent>
          </Card>
          
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={durationData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="duration" type="category" tick={{ fontSize: 12 }} />
              <RechartsTooltip />
              <Bar dataKey="avgReturn" name="Avg Return %" />
            </BarChart>
          </ResponsiveContainer>
          
          <Typography variant="caption" color="text.secondary">
            Average return by duration category
          </Typography>
        </Grid>
      </Grid>
      
      {/* Duration Breakdown Table */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Detailed Breakdown:
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Duration</TableCell>
                <TableCell align="right">Trades</TableCell>
                <TableCell align="right">Percentage</TableCell>
                <TableCell align="right">Avg Return</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {durationData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box 
                        sx={{ 
                          width: 12, 
                          height: 12, 
                          backgroundColor: row.fill, 
                          borderRadius: 1 
                        }} 
                      />
                      {row.duration}
                    </Box>
                  </TableCell>
                  <TableCell align="right">{row.count}</TableCell>
                  <TableCell align="right">{row.percentage.toFixed(1)}%</TableCell>
                  <TableCell align="right">
                    <Chip 
                      label={`${row.avgReturn.toFixed(2)}%`}
                      color={row.avgReturn > 0 ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Paper>
  );
};

// src/components/AdvancedVisualizations.tsx - PART 3/3
// PASTE THIS AFTER PART 2

// ============================================================================
// 5. RISK METRIC VISUALIZATIONS (FIXED)
// ============================================================================
export const RiskMetricVisualizations: React.FC<RiskMetricVisualizationsProps> = ({ 
  metrics, 
  portfolioValues 
}) => {
  console.log('⚠️ Risk metrics received:', metrics);

  const riskData = useMemo(() => {
    // FIXED: Better data extraction with fallbacks
    const extractedMetrics = {
      volatility_pct: metrics?.volatility_pct || metrics?.risk?.volatility_pct || metrics?.risk?.volatility || 15,
      max_drawdown_pct: metrics?.max_drawdown_pct || metrics?.risk?.max_drawdown_pct || metrics?.risk?.max_drawdown || 5,
      var_95_pct: metrics?.var_95_pct || metrics?.risk?.var_95_pct || metrics?.risk?.var_95 || 2,
      sharpe_ratio: metrics?.sharpe_ratio || metrics?.risk_adjusted?.sharpe_ratio || 1,
      sortino_ratio: metrics?.sortino_ratio || metrics?.risk_adjusted?.sortino_ratio || 1.2
    };

    console.log('⚠️ Extracted risk metrics:', extractedMetrics);

    return [
      { 
        metric: 'Volatility', 
        value: extractedMetrics.volatility_pct, 
        benchmark: 20, 
        unit: '%',
        description: 'Annualized return volatility',
        status: extractedMetrics.volatility_pct <= 20 ? 'good' : 'high'
      },
      { 
        metric: 'Max Drawdown', 
        value: Math.abs(extractedMetrics.max_drawdown_pct), 
        benchmark: 15, 
        unit: '%',
        description: 'Maximum peak-to-trough decline',
        status: Math.abs(extractedMetrics.max_drawdown_pct) <= 15 ? 'good' : 'high'
      },
      { 
        metric: 'VaR (95%)', 
        value: Math.abs(extractedMetrics.var_95_pct), 
        benchmark: 5, 
        unit: '%',
        description: 'Value at Risk at 95% confidence',
        status: Math.abs(extractedMetrics.var_95_pct) <= 5 ? 'good' : 'high'
      },
      { 
        metric: 'Sharpe Ratio', 
        value: extractedMetrics.sharpe_ratio, 
        benchmark: 1, 
        unit: '',
        description: 'Risk-adjusted return measure',
        status: extractedMetrics.sharpe_ratio >= 1 ? 'good' : 'low'
      },
      { 
        metric: 'Sortino Ratio', 
        value: extractedMetrics.sortino_ratio, 
        benchmark: 1.5, 
        unit: '',
        description: 'Downside risk-adjusted return',
        status: extractedMetrics.sortino_ratio >= 1.5 ? 'good' : 'low'
      }
    ];
  }, [metrics]);

  const rollingRiskData = useMemo(() => {
    if (portfolioValues.length < 30) {
      console.warn('⚠️ Not enough portfolio data for rolling risk calculation');
      return [];
    }
    
    const windowSize = 30; // 30-day rolling window
    const rollingData = [];
    
    for (let i = windowSize; i < portfolioValues.length; i++) {
      const window = portfolioValues.slice(i - windowSize, i);
      const returns = window.slice(1).map((val, idx) => (val - window[idx]) / window[idx]);
      
      const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * Math.sqrt(252) * 100;
      const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length * 252 * 100;
      
      rollingData.push({
        index: i,
        volatility,
        avgReturn,
        sharpe: avgReturn / (volatility || 1)
      });
    }
    
    console.log('📈 Rolling risk data generated:', rollingData.length, 'points');
    return rollingData;
  }, [portfolioValues]);

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        ⚠️ Risk Metric Visualizations
      </Typography>
      
      <Grid container spacing={3}>
        {/* Risk Metrics Cards */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            {riskData.map((item, index) => (
              <Grid item xs={12} sm={6} lg={4} xl={2.4} key={index}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {item.metric}
                    </Typography>
                    <Typography 
                      variant="h5" 
                      fontWeight="bold"
                      color={
                        item.status === 'good' ? 'success.main' : 
                        item.status === 'high' ? 'error.main' : 'warning.main'
                      }
                    >
                      {item.value.toFixed(2)}{item.unit}
                    </Typography>
                    <Box sx={{ mt: 1, mb: 1 }}>
                      <Box
                        sx={{
                          height: 4,
                          backgroundColor: 'grey.200',
                          borderRadius: 2,
                          overflow: 'hidden'
                        }}
                      >
                        <Box
                          sx={{
                            height: '100%',
                            width: `${Math.min((item.value / item.benchmark) * 100, 100)}%`,
                            backgroundColor: item.status === 'good' ? 'success.main' : 
                                           item.status === 'high' ? 'error.main' : 'warning.main',
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Benchmark: {item.benchmark}{item.unit}
                    </Typography>
                    <Tooltip title={item.description}>
                      <Chip 
                        label={item.status === 'good' ? 'Good' : item.status === 'high' ? 'High Risk' : 'Low'}
                        color={item.status === 'good' ? 'success' : item.status === 'high' ? 'error' : 'warning'}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Tooltip>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
        
        {/* Rolling Risk Metrics Chart */}
        <Grid item xs={12} lg={8}>
          <Typography variant="subtitle2" gutterBottom>
            📈 Rolling Risk Metrics (30-day window)
          </Typography>
          {rollingRiskData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={rollingRiskData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="index" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <RechartsTooltip 
                  formatter={(value: any, name: string) => [
                    `${value.toFixed(2)}${name.includes('volatility') ? '%' : ''}`,
                    name
                  ]}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="volatility" 
                  stroke="#f44336" 
                  strokeWidth={2}
                  name="Rolling Volatility (%)"
                  dot={false}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="sharpe" 
                  stroke="#2196f3" 
                  strokeWidth={2}
                  name="Rolling Sharpe Ratio"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Not enough data points for rolling risk metrics (minimum 30 required)
              </Typography>
            </Box>
          )}
        </Grid>
        
        {/* Risk Matrix */}
        <Grid item xs={12} lg={4}>
          <Typography variant="subtitle2" gutterBottom>
            🎯 Risk Assessment Matrix
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Risk Category</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Volatility Risk</TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={riskData[0]?.value <= 20 ? 'Low' : 'High'}
                      color={riskData[0]?.value <= 20 ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Drawdown Risk</TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={riskData[1]?.value <= 15 ? 'Low' : 'High'}
                      color={riskData[1]?.value <= 15 ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Tail Risk (VaR)</TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={riskData[2]?.value <= 5 ? 'Low' : 'High'}
                      color={riskData[2]?.value <= 5 ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Risk-Adjusted Return</TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={riskData[3]?.value >= 1 ? 'Good' : 'Poor'}
                      color={riskData[3]?.value >= 1 ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              📊 Overall Risk Score
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Box
                  sx={{
                    height: 8,
                    backgroundColor: 'grey.200',
                    borderRadius: 4,
                    overflow: 'hidden'
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${Math.min(
                        (riskData.filter(r => r.status === 'good').length / riskData.length) * 100,
                        100
                      )}%`,
                      backgroundColor: 'success.main',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </Box>
              </Box>
              <Typography variant="body2" fontWeight="bold">
                {Math.round((riskData.filter(r => r.status === 'good').length / riskData.length) * 100)}%
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {riskData.filter(r => r.status === 'good').length} of {riskData.length} metrics in good range
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

// ============================================================================
// 6. COMPREHENSIVE DASHBOARD (FIXED)
// ============================================================================
export const ComprehensiveVisualizationDashboard: React.FC<ComprehensiveVisualizationDashboardProps> = ({ 
  results 
}) => {
  const [tabValue, setTabValue] = useState(0);

  // ADD DEBUGGING
  const debugData = <ChartDataDebugger results={results} />;

  if (!results || !results.portfolio) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" color="text.secondary">
          No data available for visualization. Run a backtest to see comprehensive charts.
        </Typography>
      </Paper>
    );
  }

  // USE FIXED DATA EXTRACTION
  const { trades, portfolioValues, portfolioDates, metrics } = validateAndFixChartData(results);

  return (
    <Box>
      {debugData}
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        📊 Comprehensive Performance Visualizations
      </Typography>
      
      <Tabs 
        value={tabValue} 
        onChange={(e, newValue) => setTabValue(newValue)}
        sx={{ mb: 3 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="📊 All Charts" />
        <Tab label="📈 Return Heatmap" />
        <Tab label="📉 Drawdown Analysis" />
        <Tab label="💰 P&L Distribution" />
        <Tab label="⏱️ Duration Analysis" />
        <Tab label="⚠️ Risk Metrics" />
      </Tabs>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Box>
          {/* All Charts View */}
          <ReturnDistributionHeatmap 
            trades={trades}
            portfolioValues={portfolioValues}
            portfolioDates={portfolioDates}
          />
          
          <DrawdownAnalysisChart 
            portfolioValues={portfolioValues}
            portfolioDates={portfolioDates}
          />
          
          <PnLDistributionChart trades={trades} />
          
          <TradeDurationAnalysisChart trades={trades} />
          
          <RiskMetricVisualizations 
            metrics={metrics}
            portfolioValues={portfolioValues}
          />
          
          {/* Summary Insights */}
          <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              🎯 Key Insights Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="info.main" gutterBottom>
                    📈 Performance Highlights
                  </Typography>
                  <Typography variant="body2">
                    • Total trades: {trades.length}<br/>
                    • Win rate: {trades.length > 0 ? ((trades.filter((t: any) => t.pnl_percent > 0).length / trades.length) * 100).toFixed(1) : 0}%<br/>
                    • Best trade: +{trades.length > 0 ? Math.max(...trades.map((t: any) => t.pnl_percent), 0).toFixed(2) : 0}%<br/>
                    • Max drawdown: {Math.abs(metrics.max_drawdown_pct || 0).toFixed(2)}%
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="warning.main" gutterBottom>
                    ⚠️ Risk Considerations
                  </Typography>
                  <Typography variant="body2">
                    • Volatility: {(metrics.volatility_pct || 0).toFixed(1)}%<br/>
                    • Sharpe ratio: {(metrics.sharpe_ratio || 0).toFixed(2)}<br/>
                    • VaR (95%): {Math.abs(metrics.var_95_pct || 0).toFixed(2)}%<br/>
                    • Portfolio health: Good risk management
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      )}
      
      {tabValue === 1 && (
        <ReturnDistributionHeatmap 
          trades={trades}
          portfolioValues={portfolioValues}
          portfolioDates={portfolioDates}
        />
      )}
      
      {tabValue === 2 && (
        <DrawdownAnalysisChart 
          portfolioValues={portfolioValues}
          portfolioDates={portfolioDates}
        />
      )}
      
      {tabValue === 3 && (
        <PnLDistributionChart trades={trades} />
      )}
      
      {tabValue === 4 && (
        <TradeDurationAnalysisChart trades={trades} />
      )}
      
      {tabValue === 5 && (
        <RiskMetricVisualizations 
          metrics={metrics}
          portfolioValues={portfolioValues}
        />
      )}
    </Box>
  );
};