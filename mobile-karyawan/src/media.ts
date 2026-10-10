import * as ImagePicker from "expo-image-picker";
export async function pickImage() {
  if (!(await ImagePicker.requestMediaLibraryPermissionsAsync()).granted) throw new Error("Izinkan akses foto di Android.");
  const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],allowsEditing:true,quality:0.35,base64:true});
  if(result.canceled)return null;
  const asset=result.assets[0];
  if(!asset.base64)throw new Error("Foto tidak dapat dibaca.");
  const data="data:image/"+(asset.mimeType==="image/png"?"png":"jpeg")+";base64,"+asset.base64;
  if(data.length>1_500_000)throw new Error("Pilih foto lebih kecil (maksimal sekitar 1 MB).");
  return data;
}
