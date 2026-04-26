import type { MexicoState } from "./mexico-states";

// Catálogo curado de municipios/ciudades por estado. Cubre capitales y
// principales centros industriales y comerciales relevantes para el
// negocio de mecanizado y herramienta de corte. Es un subconjunto, no
// la lista completa del INEGI (~2,469 municipios) — se puede expandir
// agregando entradas a este array sin tocar schema ni migration.
//
// Validación: el helper isValidMexicoCity verifica que (state, label)
// exista en este catálogo. La UI no permite texto libre.

type CityEntry = {
  state: MexicoState;
  label: string;
};

export const MEXICO_CITIES: readonly CityEntry[] = [
  // Aguascalientes
  { state: "Aguascalientes", label: "Aguascalientes" },
  { state: "Aguascalientes", label: "Jesús María" },
  { state: "Aguascalientes", label: "San Francisco de los Romo" },
  { state: "Aguascalientes", label: "Calvillo" },
  { state: "Aguascalientes", label: "Rincón de Romos" },

  // Baja California
  { state: "Baja California", label: "Tijuana" },
  { state: "Baja California", label: "Mexicali" },
  { state: "Baja California", label: "Ensenada" },
  { state: "Baja California", label: "Tecate" },
  { state: "Baja California", label: "Rosarito" },

  // Baja California Sur
  { state: "Baja California Sur", label: "La Paz" },
  { state: "Baja California Sur", label: "Los Cabos" },
  { state: "Baja California Sur", label: "Comondú" },
  { state: "Baja California Sur", label: "Loreto" },

  // Campeche
  { state: "Campeche", label: "Campeche" },
  { state: "Campeche", label: "Ciudad del Carmen" },
  { state: "Campeche", label: "Champotón" },
  { state: "Campeche", label: "Escárcega" },

  // Chiapas
  { state: "Chiapas", label: "Tuxtla Gutiérrez" },
  { state: "Chiapas", label: "Tapachula" },
  { state: "Chiapas", label: "San Cristóbal de las Casas" },
  { state: "Chiapas", label: "Comitán" },
  { state: "Chiapas", label: "Palenque" },

  // Chihuahua
  { state: "Chihuahua", label: "Chihuahua" },
  { state: "Chihuahua", label: "Ciudad Juárez" },
  { state: "Chihuahua", label: "Delicias" },
  { state: "Chihuahua", label: "Cuauhtémoc" },
  { state: "Chihuahua", label: "Hidalgo del Parral" },
  { state: "Chihuahua", label: "Nuevo Casas Grandes" },

  // Ciudad de México
  { state: "Ciudad de México", label: "Ciudad de México" },

  // Coahuila
  { state: "Coahuila", label: "Saltillo" },
  { state: "Coahuila", label: "Torreón" },
  { state: "Coahuila", label: "Monclova" },
  { state: "Coahuila", label: "Ramos Arizpe" },
  { state: "Coahuila", label: "Piedras Negras" },
  { state: "Coahuila", label: "Frontera" },
  { state: "Coahuila", label: "Ciudad Acuña" },
  { state: "Coahuila", label: "Sabinas" },
  { state: "Coahuila", label: "San Pedro" },
  { state: "Coahuila", label: "Matamoros" },
  { state: "Coahuila", label: "Parras" },

  // Colima
  { state: "Colima", label: "Colima" },
  { state: "Colima", label: "Manzanillo" },
  { state: "Colima", label: "Tecomán" },
  { state: "Colima", label: "Villa de Álvarez" },

  // Durango
  { state: "Durango", label: "Durango" },
  { state: "Durango", label: "Gómez Palacio" },
  { state: "Durango", label: "Lerdo" },
  { state: "Durango", label: "Santiago Papasquiaro" },

  // Guanajuato
  { state: "Guanajuato", label: "León" },
  { state: "Guanajuato", label: "Irapuato" },
  { state: "Guanajuato", label: "Celaya" },
  { state: "Guanajuato", label: "Salamanca" },
  { state: "Guanajuato", label: "Guanajuato" },
  { state: "Guanajuato", label: "Silao" },
  { state: "Guanajuato", label: "San Miguel de Allende" },
  { state: "Guanajuato", label: "Apaseo el Grande" },
  { state: "Guanajuato", label: "Apaseo el Alto" },
  { state: "Guanajuato", label: "Pénjamo" },
  { state: "Guanajuato", label: "Dolores Hidalgo" },
  { state: "Guanajuato", label: "San Francisco del Rincón" },
  { state: "Guanajuato", label: "Valle de Santiago" },
  { state: "Guanajuato", label: "Acámbaro" },

  // Guerrero
  { state: "Guerrero", label: "Acapulco" },
  { state: "Guerrero", label: "Chilpancingo" },
  { state: "Guerrero", label: "Iguala" },
  { state: "Guerrero", label: "Zihuatanejo" },
  { state: "Guerrero", label: "Taxco" },

  // Hidalgo
  { state: "Hidalgo", label: "Pachuca" },
  { state: "Hidalgo", label: "Tulancingo" },
  { state: "Hidalgo", label: "Tula de Allende" },
  { state: "Hidalgo", label: "Tepeji del Río" },
  { state: "Hidalgo", label: "Tepeapulco" },
  { state: "Hidalgo", label: "Mineral de la Reforma" },

  // Jalisco
  { state: "Jalisco", label: "Guadalajara" },
  { state: "Jalisco", label: "Zapopan" },
  { state: "Jalisco", label: "Tlaquepaque" },
  { state: "Jalisco", label: "Tonalá" },
  { state: "Jalisco", label: "Tlajomulco de Zúñiga" },
  { state: "Jalisco", label: "El Salto" },
  { state: "Jalisco", label: "Lagos de Moreno" },
  { state: "Jalisco", label: "Tepatitlán" },
  { state: "Jalisco", label: "Puerto Vallarta" },
  { state: "Jalisco", label: "Ocotlán" },
  { state: "Jalisco", label: "Ciudad Guzmán" },
  { state: "Jalisco", label: "Ameca" },
  { state: "Jalisco", label: "Autlán" },
  { state: "Jalisco", label: "La Barca" },

  // México
  { state: "México", label: "Toluca" },
  { state: "México", label: "Naucalpan" },
  { state: "México", label: "Tlalnepantla" },
  { state: "México", label: "Ecatepec" },
  { state: "México", label: "Cuautitlán Izcalli" },
  { state: "México", label: "Atizapán de Zaragoza" },
  { state: "México", label: "Lerma" },
  { state: "México", label: "Metepec" },
  { state: "México", label: "Tultitlán" },
  { state: "México", label: "Coacalco" },
  { state: "México", label: "Nezahualcóyotl" },
  { state: "México", label: "Chalco" },
  { state: "México", label: "Texcoco" },
  { state: "México", label: "Cuautitlán" },
  { state: "México", label: "Ixtapaluca" },
  { state: "México", label: "Tepotzotlán" },
  { state: "México", label: "Huixquilucan" },
  { state: "México", label: "Valle de Bravo" },

  // Michoacán
  { state: "Michoacán", label: "Morelia" },
  { state: "Michoacán", label: "Uruapan" },
  { state: "Michoacán", label: "Zamora" },
  { state: "Michoacán", label: "Lázaro Cárdenas" },
  { state: "Michoacán", label: "Pátzcuaro" },
  { state: "Michoacán", label: "Apatzingán" },
  { state: "Michoacán", label: "Sahuayo" },
  { state: "Michoacán", label: "Zitácuaro" },

  // Morelos
  { state: "Morelos", label: "Cuernavaca" },
  { state: "Morelos", label: "Jiutepec" },
  { state: "Morelos", label: "Cuautla" },
  { state: "Morelos", label: "Civac" },
  { state: "Morelos", label: "Yautepec" },
  { state: "Morelos", label: "Temixco" },

  // Nayarit
  { state: "Nayarit", label: "Tepic" },
  { state: "Nayarit", label: "Bahía de Banderas" },
  { state: "Nayarit", label: "Compostela" },
  { state: "Nayarit", label: "Xalisco" },

  // Nuevo León
  { state: "Nuevo León", label: "Monterrey" },
  { state: "Nuevo León", label: "San Pedro Garza García" },
  { state: "Nuevo León", label: "Guadalupe" },
  { state: "Nuevo León", label: "Apodaca" },
  { state: "Nuevo León", label: "General Escobedo" },
  { state: "Nuevo León", label: "San Nicolás de los Garza" },
  { state: "Nuevo León", label: "García" },
  { state: "Nuevo León", label: "Santa Catarina" },
  { state: "Nuevo León", label: "Juárez" },
  { state: "Nuevo León", label: "Pesquería" },
  { state: "Nuevo León", label: "Cadereyta Jiménez" },
  { state: "Nuevo León", label: "Linares" },
  { state: "Nuevo León", label: "Sabinas Hidalgo" },

  // Oaxaca
  { state: "Oaxaca", label: "Oaxaca" },
  { state: "Oaxaca", label: "Salina Cruz" },
  { state: "Oaxaca", label: "Tuxtepec" },
  { state: "Oaxaca", label: "Juchitán" },
  { state: "Oaxaca", label: "Huatulco" },
  { state: "Oaxaca", label: "Puerto Escondido" },

  // Puebla
  { state: "Puebla", label: "Puebla" },
  { state: "Puebla", label: "San Pedro Cholula" },
  { state: "Puebla", label: "San Andrés Cholula" },
  { state: "Puebla", label: "Tehuacán" },
  { state: "Puebla", label: "Atlixco" },
  { state: "Puebla", label: "San Martín Texmelucan" },
  { state: "Puebla", label: "Huauchinango" },
  { state: "Puebla", label: "Teziutlán" },
  { state: "Puebla", label: "Amozoc" },

  // Querétaro
  { state: "Querétaro", label: "Querétaro" },
  { state: "Querétaro", label: "San Juan del Río" },
  { state: "Querétaro", label: "El Marqués" },
  { state: "Querétaro", label: "Corregidora" },
  { state: "Querétaro", label: "Tequisquiapan" },
  { state: "Querétaro", label: "Ezequiel Montes" },
  { state: "Querétaro", label: "Pedro Escobedo" },

  // Quintana Roo
  { state: "Quintana Roo", label: "Cancún" },
  { state: "Quintana Roo", label: "Playa del Carmen" },
  { state: "Quintana Roo", label: "Chetumal" },
  { state: "Quintana Roo", label: "Cozumel" },
  { state: "Quintana Roo", label: "Tulum" },

  // San Luis Potosí
  { state: "San Luis Potosí", label: "San Luis Potosí" },
  { state: "San Luis Potosí", label: "Soledad de Graciano Sánchez" },
  { state: "San Luis Potosí", label: "Matehuala" },
  { state: "San Luis Potosí", label: "Ciudad Valles" },
  { state: "San Luis Potosí", label: "Rioverde" },
  { state: "San Luis Potosí", label: "Tamazunchale" },

  // Sinaloa
  { state: "Sinaloa", label: "Culiacán" },
  { state: "Sinaloa", label: "Mazatlán" },
  { state: "Sinaloa", label: "Los Mochis" },
  { state: "Sinaloa", label: "Guasave" },
  { state: "Sinaloa", label: "Navolato" },
  { state: "Sinaloa", label: "Guamúchil" },

  // Sonora
  { state: "Sonora", label: "Hermosillo" },
  { state: "Sonora", label: "Ciudad Obregón" },
  { state: "Sonora", label: "Nogales" },
  { state: "Sonora", label: "Navojoa" },
  { state: "Sonora", label: "Guaymas" },
  { state: "Sonora", label: "Empalme" },
  { state: "Sonora", label: "Caborca" },
  { state: "Sonora", label: "Magdalena" },
  { state: "Sonora", label: "San Luis Río Colorado" },
  { state: "Sonora", label: "Agua Prieta" },

  // Tabasco
  { state: "Tabasco", label: "Villahermosa" },
  { state: "Tabasco", label: "Cárdenas" },
  { state: "Tabasco", label: "Comalcalco" },
  { state: "Tabasco", label: "Huimanguillo" },
  { state: "Tabasco", label: "Macuspana" },

  // Tamaulipas
  { state: "Tamaulipas", label: "Tampico" },
  { state: "Tamaulipas", label: "Reynosa" },
  { state: "Tamaulipas", label: "Matamoros" },
  { state: "Tamaulipas", label: "Ciudad Victoria" },
  { state: "Tamaulipas", label: "Nuevo Laredo" },
  { state: "Tamaulipas", label: "Ciudad Madero" },
  { state: "Tamaulipas", label: "Altamira" },
  { state: "Tamaulipas", label: "Río Bravo" },
  { state: "Tamaulipas", label: "Mante" },

  // Tlaxcala
  { state: "Tlaxcala", label: "Tlaxcala" },
  { state: "Tlaxcala", label: "Apizaco" },
  { state: "Tlaxcala", label: "Huamantla" },
  { state: "Tlaxcala", label: "Chiautempan" },
  { state: "Tlaxcala", label: "Calpulalpan" },

  // Veracruz
  { state: "Veracruz", label: "Veracruz" },
  { state: "Veracruz", label: "Xalapa" },
  { state: "Veracruz", label: "Coatzacoalcos" },
  { state: "Veracruz", label: "Córdoba" },
  { state: "Veracruz", label: "Orizaba" },
  { state: "Veracruz", label: "Boca del Río" },
  { state: "Veracruz", label: "Poza Rica" },
  { state: "Veracruz", label: "Minatitlán" },
  { state: "Veracruz", label: "Tuxpan" },
  { state: "Veracruz", label: "Martínez de la Torre" },
  { state: "Veracruz", label: "San Andrés Tuxtla" },

  // Yucatán
  { state: "Yucatán", label: "Mérida" },
  { state: "Yucatán", label: "Valladolid" },
  { state: "Yucatán", label: "Progreso" },
  { state: "Yucatán", label: "Tizimín" },
  { state: "Yucatán", label: "Kanasín" },

  // Zacatecas
  { state: "Zacatecas", label: "Zacatecas" },
  { state: "Zacatecas", label: "Fresnillo" },
  { state: "Zacatecas", label: "Guadalupe" },
  { state: "Zacatecas", label: "Jerez" },
  { state: "Zacatecas", label: "Sombrerete" },
];

const KEY_OF = (state: string, label: string) => `${state}::${label.toLowerCase()}`;
const VALID_CITY_KEYS = new Set(
  MEXICO_CITIES.map((c) => KEY_OF(c.state, c.label)),
);

export function isValidMexicoCity(state: string, city: string): boolean {
  if (!state || !city) return false;
  return VALID_CITY_KEYS.has(KEY_OF(state, city.trim()));
}

export function citiesForState(state: MexicoState): readonly CityEntry[] {
  return MEXICO_CITIES.filter((c) => c.state === state);
}
