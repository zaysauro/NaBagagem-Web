export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

export type Trip = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_image: string | null;
  created_at: string;
};

export type TripEvent = {
  id: string;
  trip_id: string;
  user_id: string;
  title: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  event_date: string | null;
  emoji: string | null;
  created_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  trip_id: string | null;
  content: string;
  created_at: string;
};
