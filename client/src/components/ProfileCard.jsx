import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import StateMessage from './StateMessage';

export default function ProfileCard({ user }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [focus, setFocus] = useState('');

  const updateProfile = useMutation({
    mutationFn: api.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setEditing(false);
    },
  });

  function startEdit() {
    setName(user.name || '');
    setBio(user.profile?.bio || '');
    setFocus(user.profile?.focus || '');
    setEditing(true);
  }

  function submit(e) {
    e.preventDefault();
    const patch = {};
    if (name.trim() && name.trim() !== user.name) patch.name = name.trim();
    if (bio.trim() !== (user.profile?.bio || ''))
      patch.bio = bio.trim() || null;
    if (focus.trim() !== (user.profile?.focus || ''))
      patch.focus = focus.trim() || null;
    if (Object.keys(patch).length === 0) {
      setEditing(false);
      return;
    }
    updateProfile.mutate(patch);
  }

  if (!editing) {
    return (
      <div className="profile-card-body">
        {user.profile?.focus && (
          <p className="profile-focus">{user.profile.focus}</p>
        )}
        {user.profile?.bio && <p className="profile-bio">{user.profile.bio}</p>}
        <button
          className="link-button"
          onClick={startEdit}
          aria-label="Edit profile"
        >
          Edit profile
        </button>
      </div>
    );
  }

  return (
    <form className="profile-edit-form" onSubmit={submit}>
      <label>
        Name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
        />
      </label>
      <label>
        Focus
        <input
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="e.g. Frontend, Backend, DevOps"
        />
      </label>
      <label>
        Bio
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="A short bio"
          rows={3}
        />
      </label>
      {updateProfile.isError && (
        <StateMessage>
          Couldn't save profile. {updateProfile.error.message}
        </StateMessage>
      )}
      <div className="profile-edit-actions">
        <button className="button" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          className="button button-ghost"
          onClick={() => setEditing(false)}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
