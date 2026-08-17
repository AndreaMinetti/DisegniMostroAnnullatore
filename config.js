// Configurazione pubblica del sito.
// La publishable/anon key di Supabase può stare nel browser SOLO se hai eseguito
// correttamente le policy RLS contenute in supabase-setup.sql.
// Non inserire MAI qui una secret key o service_role key.

window.APP_CONFIG = {
  projectName: "La galleria dei piccoli artisti",

  // Esempio: https://abcdefghijk.supabase.co
  supabaseUrl: "https://ndtftbwzpcevlbluhxin.supabase.co",

  // Usa la chiave "Publishable key" (o legacy "anon public"), non la secret key.
  supabasePublishableKey: "sb_publishable_y9BXd_SRgl0NGgbO3VM49g_R-fmxFO7",

  // Inserisci l'URL completo del profilo Instagram.
  instagramUrl: "https://www.instagram.com/ilmostroannullatore/",

  // Email usata solo per eventuali richieste di rimozione.
  contactEmail: "spark@pantechne.art"
};
