export interface Vehicle {
  vin: string;
  brand: string;
  model: string;
  year: number;
  priceUsd: number;
  kilometers: number;
  color: string;
  available: boolean;
  features: string[];
}

export const INVENTORY: Vehicle[] = [
  {
    vin: "1HGCM82633A123456",
    brand: "Toyota",
    model: "Corolla XLI",
    year: 2024,
    priceUsd: 22500,
    kilometers: 0,
    color: "Blanco perla",
    available: true,
    features: ["A/C", "Cámara de retroceso", "Bluetooth", "Cruise control"],
  },
  {
    vin: "2HGCM82633B654321",
    brand: "Toyota",
    model: "Hilux SRX",
    year: 2025,
    priceUsd: 48900,
    kilometers: 0,
    color: "Gris metalizado",
    available: true,
    features: ["4x4", "Cuero", "Pantalla 10''", "Sensores 360"],
  },
  {
    vin: "3VWFE21C04M000789",
    brand: "Volkswagen",
    model: "Amarok V6",
    year: 2024,
    priceUsd: 56200,
    kilometers: 12000,
    color: "Negro",
    available: true,
    features: ["4x4", "Diésel V6", "Asientos calefaccionados"],
  },
  {
    vin: "JN1AZ4EH9DM430001",
    brand: "Ford",
    model: "Ranger Limited",
    year: 2024,
    priceUsd: 51500,
    kilometers: 8500,
    color: "Rojo",
    available: true,
    features: ["4x4", "Caja automática", "Tracción AWD"],
  },
  {
    vin: "WBA3A5C50DF123987",
    brand: "Chevrolet",
    model: "Onix LTZ",
    year: 2024,
    priceUsd: 18900,
    kilometers: 0,
    color: "Azul",
    available: true,
    features: ["A/C", "Pantalla 8''", "MyLink", "ABS"],
  },
  {
    vin: "5YJSA1E26HF000222",
    brand: "Honda",
    model: "Civic Sport",
    year: 2023,
    priceUsd: 31200,
    kilometers: 18000,
    color: "Plata",
    available: false,
    features: ["Sport mode", "Honda Sensing"],
  },
];
