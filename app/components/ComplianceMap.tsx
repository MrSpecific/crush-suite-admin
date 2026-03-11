'use client';
import { Box } from '@radix-ui/themes';
import {
  ComposableMap,
  ZoomableGroup,
  Geographies,
  Geography,
  // Markers,
  Marker,
  Annotation,
} from 'react-simple-maps';
// import { geoAlbersUsa } from 'd3-geo';

const geoUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

export type StateRecord = { abbr: string; name: string };

export type StateList = string[];

export const ComplianceMap = ({ states }: { states: StateList }) => {
  return (
    <ComposableMap
      projection="geoAlbersUsa"
      fill="var(--gray-3)"
      stroke="var(--gray-8)"
      style={{ maxWidth: '100%' }}
    >
      <Geographies geography={geoUrl}>
        {({ geographies }) =>
          geographies.map((geo) => {
            // console.log(geo);
            const fillColor = states.includes(geo.properties.name) ? 'var(--accent-10)' : undefined;
            return <Geography key={geo.rsmKey} geography={geo} fill={fillColor} />;
          })
        }
      </Geographies>
    </ComposableMap>
  );
};
