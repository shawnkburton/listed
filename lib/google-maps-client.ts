/// <reference types="google.maps" />

export const googleMapsBrowserKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

let loader: Promise<typeof import('@googlemaps/js-api-loader')> | undefined;

export async function loadGoogleMapsLibrary<Name extends 'maps3d' | 'streetView'>(name: Name) {
  if (!googleMapsBrowserKey) throw new Error('Google Maps is not configured.');
  loader ??= import('@googlemaps/js-api-loader').then(module => {
    module.setOptions({key: googleMapsBrowserKey, v: 'quarterly', authReferrerPolicy: 'origin'});
    return module;
  });
  return (await loader).importLibrary(name);
}
