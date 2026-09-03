import { supabase } from '@/lib/supabase';

/**
 * Plays a pleasant notification audio chime using Web Audio API (no external file dependency)
 */
export const playNotificationChime = (type = 'normal') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    const freq1 = type === 'urgent' ? 880 : 587.33; // A5 or D5
    const freq2 = type === 'urgent' ? 1174.66 : 880; // D6 or A5

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq1, now);
    osc1.frequency.exponentialRampToValueAtTime(freq2, now + 0.12);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq1 * 1.5, now);
    osc2.frequency.exponentialRampToValueAtTime(freq2 * 1.5, now + 0.12);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  } catch {
    // Silent catch if audio autoplay is restricted
  }
};

/**
 * Maps CRM French priority labels to database priority enum ('low', 'normal', 'high', 'urgent')
 */
export const mapPriorityToEnum = (prioriteStr) => {
  const p = (prioriteStr || '').toLowerCase();
  if (p.includes('urgent')) return 'urgent';
  if (p.includes('haute') || p.includes('high')) return 'high';
  if (p.includes('basse') || p.includes('low')) return 'low';
  return 'normal';
};

/**
 * Automatically creates an Alert & Notification when a devis (pipeline) is assigned to an agent.
 */
export const notifyDevisAssignment = async ({
  devisId,
  nomDevis,
  nomProspect,
  destination,
  priorite,
  assignedAgentId,
  assignedAgentNom,
  creatorUser
}) => {
  if (!assignedAgentId) return;

  try {
    const priorityEnum = mapPriorityToEnum(priorite);
    const destLabel = destination ? ` • ${destination}` : '';
    const title = `Devis assigné : ${nomProspect || 'Client'}${destLabel}`;
    
    const creatorName = creatorUser?.user_metadata?.nom || creatorUser?.email?.split('@')[0] || 'un administrateur';
    const content = `Vous avez été assigné au devis "${nomDevis || 'Devis prospect'}" par ${creatorName}. Priorité : ${priorite || 'Normale'}.`;

    // 1. Insert alert in alerts table
    const { data: newAlert, error: alertErr } = await supabase
      .from('alerts')
      .insert({
        title,
        content,
        priority: priorityEnum,
        status: 'active',
        alert_at: new Date().toISOString(),
        entity_type: 'pipeline',
        entity_id: devisId || null,
        created_by: creatorUser?.id || null,
        metadata: {
          nom_prospect: nomProspect,
          destination,
          nom_devis: nomDevis,
          assigned_agent_nom: assignedAgentNom
        }
      })
      .select('id')
      .single();

    if (alertErr || !newAlert) {
      console.warn('Erreur création alerte devis:', alertErr);
      return;
    }

    // 2. Assign to the designated agent in alert_recipients
    const { error: recErr } = await supabase
      .from('alert_recipients')
      .insert({
        alert_id: newAlert.id,
        recipient_id: assignedAgentId,
        is_seen: false,
        is_done: false
      });

    if (recErr) {
      console.warn('Erreur attribution destinataire alerte:', recErr);
    }
  } catch (err) {
    console.warn('Erreur notifyDevisAssignment:', err);
  }
};
