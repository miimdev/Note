import type { Metadata } from 'next';
import { GraphScreen } from '@/features/graph/graph-screen';

export const metadata: Metadata = { title: 'شبکه دانش' };

export default function GraphPage() {
  return <GraphScreen />;
}
