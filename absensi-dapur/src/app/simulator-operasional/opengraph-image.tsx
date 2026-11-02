import { ImageResponse } from "next/og";

export const alt = "Simulator Anggaran Operasional SPPG — hitung pagu, biaya, dan honor dengan mudah";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div style={{display:"flex", width:"100%", height:"100%", background:"#102d43", color:"white", fontFamily:"sans-serif", padding:"60px 68px", position:"relative"}}>
      <div style={{display:"flex", flexDirection:"column", width:600}}>
        <div style={{display:"flex", color:"#eccb78", fontSize:22, letterSpacing:3}}>DJATI · ALAT BANTU SPPG</div>
        <div style={{display:"flex", flexDirection:"column", fontSize:60, fontWeight:750, lineHeight:1.1, marginTop:40}}><div style={{display:"flex"}}>Anggaran dapur</div><div style={{display:"flex"}}>lebih terkendali.</div></div>
        <div style={{display:"flex", flexDirection:"column", fontSize:25, color:"#c7dbe5", lineHeight:1.45, marginTop:30}}><div style={{display:"flex"}}>Hitung biaya dan honor.</div><div style={{display:"flex"}}>Bandingkan pilihan sebelum memutuskan.</div></div>
        <div style={{display:"flex", marginTop:45, background:"#e8c978", color:"#17344a", borderRadius:30, padding:"14px 24px", fontSize:21, fontWeight:700, alignSelf:"flex-start"}}>Simulator Operasional SPPG</div>
        <div style={{display:"flex", marginTop:30, color:"#adc6d5", fontSize:20}}>djati.web.id/simulator-operasional</div>
      </div>
      <div style={{display:"flex", flexDirection:"column", width:375, height:435, marginLeft:55, marginTop:35, background:"#f7faf9", borderRadius:20, padding:28, color:"#17344a"}}>
        <div style={{display:"flex", fontSize:17, color:"#5b7580"}}>RINGKASAN SIMULASI</div>
        <div style={{display:"flex", fontSize:30, fontWeight:700, marginTop:15}}>Gambaran anggaran</div>
        <div style={{display:"flex", borderRadius:12, background:"#e3f3ed", padding:18, marginTop:25, flexDirection:"column"}}><span style={{fontSize:16,color:"#3c7d70"}}>HASIL TERHADAP PAGU</span><span style={{fontSize:26,fontWeight:700,marginTop:8}}>Lihat sisa anggaran</span></div>
        <div style={{display:"flex", justifyContent:"space-between", marginTop:28, fontSize:20}}><span>Biaya operasional</span><span>• • •</span></div>
        <div style={{display:"flex", width:"100%", height:8, borderRadius:8, marginTop:10, background:"#d9e8e7"}}><div style={{display:"flex", width:"70%", background:"#168679", borderRadius:8}}/></div>
        <div style={{display:"flex", justifyContent:"space-between", marginTop:25, fontSize:20}}><span>Honor relawan</span><span>• • •</span></div>
        <div style={{display:"flex", width:"100%", height:8, borderRadius:8, marginTop:10, background:"#d9e8e7"}}><div style={{display:"flex", width:"48%", background:"#dfb95e", borderRadius:8}}/></div>
        <div style={{display:"flex", fontSize:16, marginTop:27, color:"#6a8187"}}>Mudah diisi · Tanpa login</div>
      </div>
    </div>, size,
  );
}
