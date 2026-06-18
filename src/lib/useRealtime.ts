import { useEffect } from 'react';
import { supabase } from './supabase';
import { useAuthStore, useMatchingStore } from '../store';

export function useSupabaseRealtime() {
  const { user } = useAuthStore();
  const { setMatches } = useMatchingStore();

  useEffect(() => {
    if (!user) return;

    // Listen to Waitlist updates
    const waitlistChannel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Waitlist',
          filter: `userId=eq.${user.id}`,
        },
        (payload) => {
          console.log('Waitlist changed:', payload);
          // Trigger re-fetch of matches or alerts
        }
      )
      .subscribe();

    // Listen to Group updates (e.g. member joined, locked)
    const groupsChannel = supabase
      .channel('groups-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'RideGroup',
        },
        (payload) => {
          console.log('RideGroup updated:', payload);
          // Refetch groups
        }
      )
      .subscribe();

    // Listen to Notifications
    const notificationChannel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Notification',
          filter: `userId=eq.${user.id}`,
        },
        (payload) => {
          console.log('New notification:', payload);
          // Could dispatch a toast notification here
        }
      )
      .subscribe();

    // Listen to Route Communities (Demand Heatmaps)
    const demandChannel = supabase
      .channel('demand-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'RouteCommunity',
        },
        (payload) => {
          console.log('Route community demand changed:', payload);
          // Update demand UI real-time
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(waitlistChannel);
      supabase.removeChannel(groupsChannel);
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(demandChannel);
    };
  }, [user, setMatches]);
}
