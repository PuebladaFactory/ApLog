import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class SupabaseStorageService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      'https://inblxpskpbzbmgsetuas.supabase.co',  // 🔹 Reemplazar con tu Project URL
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluYmx4cHNrcGJ6Ym1nc2V0dWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDY3NjIsImV4cCI6MjA3MTUyMjc2Mn0.TRja5GQwYD2LJDHz6p-TT1c8b3Pz_Jo87ta28MPRyvE'                 // 🔹 Reemplazar con tu Anon Key      
    );
  }

  async uploadFactura(file: File, nombreArchivo: string): Promise<string | null> {
    const { data, error } = await this.supabase.storage
      .from('facturas')
      .upload(nombreArchivo, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error subiendo factura:', error);
      return null;
    }

    // 🔹 En lugar de devolver la URL pública, devolvemos el path (nombreArchivo)
    return nombreArchivo;
  }

  async verFactura(path: string): Promise<string | null> {
    const { data, error } = await this.supabase.storage
      .from('facturas')
      .createSignedUrl(path, 60); // 🔹 válido 60 segundos

    if (error) {
      console.error("Error creando signed URL:", error.message);
      return null;
    }

    return data?.signedUrl || null;
  }
}
