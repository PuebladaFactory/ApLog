import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DomicilioService {

  apiUrl: string = "https://apis.datos.gob.ar/georef/api";

  constructor(private http:HttpClient) { }

  getProvincias(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/provincias`).pipe(
      map((data) => {
        data.provincias.sort((a: any, b: any) =>
          a.nombre.localeCompare(b.nombre)
        );
        return data;
      })
    );;
  }

  getMunicipios(provincia: string): Observable<any> {
    const url = `${this.apiUrl}/municipios?provincia=${encodeURIComponent(provincia)}&campos=id,nombre&max=450`;
    return this.http.get<any>(url).pipe(
      map((data) => {
        data.municipios.sort((a: any, b: any) =>
          a.nombre.localeCompare(b.nombre)
        );
        return data;
      })
    );;
  }

  getLocalidades(municipio: string, provincia:string): Observable<any> {
    const url = `${this.apiUrl}/localidades?municipio=${encodeURIComponent(municipio)}&provincia=${encodeURIComponent(provincia)}&campos=id,nombre&max=100`;
    return this.http.get<any>(url).pipe(
      map((data) => {
        data.localidades.sort((a: any, b: any) =>
          a.nombre.localeCompare(b.nombre)
        ); // Ordena las localidades alfabéticamente
        return data;
      })
    );
  }


}
