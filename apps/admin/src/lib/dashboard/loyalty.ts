// apps/admin/src/lib/dashboard/loyalty.ts
// Tile 2: Loajalita / Retention — data fetch + aggregation.
// To be implemented in Milestone 6 (most complex, last).

export interface RetentionBuckets {
  total: number;
  bucket_2_plus: number;
  bucket_3_plus: number;
  bucket_5_plus: number;
  bucket_10_plus: number;
}

export interface LoyaltyData {
  totalRetention: RetentionBuckets;
  perStudio: Array<{ studio_name: string } & RetentionBuckets>;
  loyalRetention: RetentionBuckets & {
    studio_buckets: { two: number; three_to_four: number; five_plus: number };
  };
}
