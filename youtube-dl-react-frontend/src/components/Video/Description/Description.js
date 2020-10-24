import React from 'react';
import { parseStringToDom } from './parseStringToDom';
import { mapDomToReact } from './mapDomToReact';

const Description = ({ text, player }) => (
    <div className="video-description">{parseStringToDom(text).map((node, idx) => mapDomToReact(node, idx, player))}</div>
);

export default Description;
