import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { Place } from "@/lib/types";

const markerIcon = L.divIcon({
  className: "tf-map-marker",
  html: '<span aria-hidden="true"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function FitPlaces({ places }: { places: Place[] }) {
  const map = useMap();
  useEffect(() => {
    if (!places.length) return;
    const bounds = L.latLngBounds(places.map((place) => [place.lat, place.lng]));
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 13 });
  }, [map, places]);
  return null;
}

export default function TripMap({ places }: { places: Place[] }) {
  const first = places[0];
  if (!first) return <div className="grid h-full place-items-center bg-muted text-sm text-muted-foreground">No locations yet</div>;

  return (
    <MapContainer center={[first.lat, first.lng]} zoom={11} scrollWheelZoom={false} className="h-full w-full" aria-label="Trip locations map">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {places.map((place) => (
        <Marker key={place.id} position={[place.lat, place.lng]} icon={markerIcon}>
          <Popup><strong>{place.name}</strong>{place.detail ? <><br />{place.detail}</> : null}</Popup>
        </Marker>
      ))}
      <FitPlaces places={places} />
    </MapContainer>
  );
}
