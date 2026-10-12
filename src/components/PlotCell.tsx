// import React from '@angular-devkit/build-angular';
// import { PlotData, PlotType } from '../types';
// import { Home, Building2, Square, Droplets, Hospital, Trees } from '@angular-devkit/build-angular';

// interface PlotCellProps {
//   plotKey: string;
//   data?: PlotData;
//   isSelected: boolean;
//   onClick: () => void;
//   isLarge?: boolean;
//   customClass?: string;
// }

// const PlotCell: React.FC<PlotCellProps> = ({ data, isSelected, onClick, isLarge, customClass: extraClass }) => {
//   const type = data?.type || 'vacant';
  
//   let content = null;
//   let customClass = '';

//   if (type === 'house') {
//     customClass = 'plot-3d-house';
//     const owner = data?.residents.find(r => r.role === 'owner');
//     const ownerName = owner ? owner.name.split(' ')[0] : 'Available';
//     const resCount = data?.residents.length || 0;
//     const hasOwner = data?.residents.some(r => r.role === 'owner');

//     content = (
//       <div className="flex flex-col items-center justify-center h-full p-2 text-center">
//         <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center mb-1 shadow-inner">
//           <Home className="w-5 h-5 text-house" />
//         </div>
//         <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate w-full">
//           {ownerName}
//         </span>
//         <div className="mt-1 flex gap-1">
//           <span className={`text-[7px] px-1.5 py-0.5 rounded font-black ${hasOwner ? 'bg-house text-slate-900' : 'bg-apt text-slate-900'}`}>
//             {hasOwner ? 'OWNED' : 'RENTED'}
//           </span>
//           {resCount > 0 && (
//             <span className="text-[7px] px-1.5 py-0.5 bg-white/20 text-white rounded font-bold">
//               {resCount}
//             </span>
//           )}
//         </div>
//       </div>
//     );
//   } else if (type === 'apartment') {
//     customClass = 'plot-3d-apt';
//     const totalUnits = (data?.aptConfig?.floors || 0) * (data?.aptConfig?.unitsPerFloor || 0);
//     const occupied = data?.residents.length || 0;

//     content = (
//       <div className="flex flex-col items-center justify-center h-full p-2 text-center">
//         <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center mb-1 shadow-inner">
//           <Building2 className="w-5 h-5 text-apt" />
//         </div>
//         <span className="text-[9px] font-bold text-white uppercase tracking-tight truncate w-full">
//           {data?.aptConfig?.blockName || 'Tower'}
//         </span>
//         <span className="text-[8px] text-white/60 font-medium">
//           {data?.aptConfig?.floors}F · {totalUnits}U
//         </span>
//         <div className="mt-1 flex items-center gap-1">
//            <div className="flex gap-0.5">
//              {[...Array(Math.min(6, totalUnits))].map((_, i) => (
//                <div key={i} className={`w-1 h-1 rounded-full ${i < occupied ? 'bg-white' : 'bg-white/20'}`} />
//              ))}
//            </div>
//            <span className="text-[8px] text-white font-black">
//              {occupied}/{totalUnits}
//            </span>
//         </div>
//       </div>
//     );
//   } else if (type === 'watertank') {
//     customClass = 'plot-3d-tank';
//     content = (
//       <div className="flex flex-col items-center justify-center h-full p-2 text-center">
//         <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center mb-1 shadow-inner border border-blue-500/30">
//           <Droplets className="w-5 h-5 text-blue-500" />
//         </div>
//         <span className="text-[10px] font-black text-white uppercase tracking-widest">TANK</span>
//         <span className="text-[8px] text-blue-400 font-bold">UTILITY</span>
//       </div>
//     );
//   } else if (type === 'hospital') {
//     customClass = 'plot-3d-clinic';
//     content = (
//       <div className="flex flex-col items-center justify-center h-full p-2 text-center">
//         <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center mb-1 shadow-inner border border-red-500/30">
//           <Hospital className="w-5 h-5 text-red-500" />
//         </div>
//         <span className="text-[10px] font-black text-white uppercase tracking-widest">CLINIC</span>
//         <span className="text-[8px] text-red-400 font-bold">MEDICAL</span>
//       </div>
//     );
//   } else if (type === 'park') {
//     customClass = 'plot-3d-park';
//     content = (
//       <div className="flex flex-col items-center justify-center h-full p-2 text-center">
//         <div className={`bg-green-500/20 rounded-full flex items-center justify-center mb-1 shadow-inner border border-green-500/30 ${isLarge ? 'w-20 h-20' : 'w-10 h-10'}`}>
//           <Trees className={`${isLarge ? 'w-12 h-12' : 'w-5 h-5'} text-green-500`} />
//         </div>
//         <span className={`${isLarge ? 'text-2xl' : 'text-[10px]'} font-black text-white uppercase tracking-widest`}>PARK</span>
//         <span className={`${isLarge ? 'text-xs' : 'text-[8px]'} text-green-400 font-bold`}>PRESTIGE RESERVE</span>
//       </div>
//     );
//   } else {
//     content = (
//       <div className="flex flex-col items-center justify-center h-full opacity-30 group-hover:opacity-60 transition-opacity">
//         <Square className="w-6 h-6 mb-1 text-slate-400" />
//         <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-slate-400">Vacant</span>
//       </div>
//     );
//   }

//   return (
//     <div 
//       className={`plot-cell group ${isSelected ? 'selected' : ''} ${customClass} ${extraClass || ''} ${isLarge ? '!w-full !h-full min-w-[100px] min-h-[100px]' : ''}`}
//       onClick={onClick}
//     >
//       {content}
//       {isSelected && (
//         <div className="absolute -top-1 -right-1">
//           <div className="w-3 h-3 bg-select rounded-full shadow-[0_0_10px_#fbbf24] animate-pulse" />
//         </div>
//       )}
//     </div>
//   );
// };

// export default PlotCell;
