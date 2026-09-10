'use client';
import { useEffect } from 'react';
import { injetarPixels } from '@/lib/pixels';
export default function Pixels({ integracoes }) {
  useEffect(() => { injetarPixels(integracoes || {}); }, [integracoes]);
  return null;
}
