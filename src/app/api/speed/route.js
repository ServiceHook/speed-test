import { NextResponse } from "next/server";

export async function POST(req) {
  // We read the body to force the data to fully upload
  await req.blob(); 
  
  // We return immediately after receiving
  return NextResponse.json({ success: true });
}