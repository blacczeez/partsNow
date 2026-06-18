import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllFeatures, getFeatureBySlug } from '@/lib/data/features';
import { FeaturePageLayout } from '@/components/marketing/feature-page-layout';

export function generateStaticParams() {
  return getAllFeatures().map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const feature = getFeatureBySlug(slug);
  if (!feature) return { title: 'Feature Not Found | PartsDey' };

  return {
    title: `${feature.title} | PartsDey`,
    description: feature.tagline,
  };
}

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const feature = getFeatureBySlug(slug);

  if (!feature) {
    notFound();
  }

  return <FeaturePageLayout data={feature} />;
}
