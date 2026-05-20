export const FEED_URLS: Record<string, string> = {
  '1234567':
    'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs',
  ACE: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace',
  BDFM: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm',
  G: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g',
  JZ: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz',
  L: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l',
  NQRW: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw',
  SIR: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-si',
};

export const ROUTE_TO_FEED: Record<string, string> = {
  '1': '1234567', '2': '1234567', '3': '1234567',
  '4': '1234567', '5': '1234567', '5X': '1234567',
  '6': '1234567', '6X': '1234567',
  '7': '1234567', '7X': '1234567',
  GS: '1234567',
  A: 'ACE', C: 'ACE', E: 'ACE', H: 'ACE',
  B: 'BDFM', D: 'BDFM', F: 'BDFM', FX: 'BDFM', M: 'BDFM', FS: 'BDFM',
  G: 'G',
  J: 'JZ', Z: 'JZ',
  L: 'L',
  N: 'NQRW', Q: 'NQRW', R: 'NQRW', W: 'NQRW',
  SI: 'SIR',
};
