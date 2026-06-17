import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase;

// Se le chiavi Supabase non sono configurate, creiamo un client emulato basato su localStorage
// per garantire che l'app rimanga testabile e funzionante immediatamente "out of the box".
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Supabase URL o Anon Key mancanti in .env. L'app sta funzionando in MODALITÀ EMULATA usando LocalStorage per database e auth."
  );

  // In-memory fallback per ambienti Node o browser con localStorage disabilitato
  const memStorage = {};
  
  const getItem = (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return memStorage[key] || null;
    }
  };

  const setItem = (key, val) => {
    try {
      localStorage.setItem(key, val);
    } catch {
      memStorage[key] = val;
    }
  };

  const removeItem = (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      delete memStorage[key];
    }
  };

  const dispatchStorageEvent = () => {
    try {
      window.dispatchEvent(new Event("storage"));
    } catch {}
  };

  // Auth state listener emulato
  const authListeners = new Set();
  
  // Database mock helper per localStorage
  const getMockTable = (table) => {
    try {
      const data = getItem(`mock_db_${table}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  };

  const saveMockTable = (table, data) => {
    setItem(`mock_db_${table}`, JSON.stringify(data));
    dispatchStorageEvent();
  };

  // Ottiene l'utente corrente mock
  const getMockUser = () => {
    try {
      const u = getItem("mock_auth_user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  };

  supabase = {
    isMock: true,
    auth: {
      signUp: async ({ email, password, options }) => {
        await new Promise(r => setTimeout(r, 800)); // Simula latenza
        const users = getMockTable("users");
        const exists = users.some(u => u.email === email);
        if (exists) {
          return { data: { user: null }, error: { message: "Email già registrata" } };
        }
        const newUser = {
          id: `usr-${Date.now()}`,
          email,
          user_metadata: options?.data || {}
        };
        users.push(newUser);
        saveMockTable("users", users);
        return { data: { user: newUser }, error: null };
      },

      signInWithPassword: async ({ email, password }) => {
        await new Promise(r => setTimeout(r, 600));
        const users = getMockTable("users");
        const found = users.find(u => u.email === email);
        if (!found) {
          return { data: { session: null, user: null }, error: { message: "Email o password errata" } };
        }
        const session = {
          access_token: `tok-${Date.now()}`,
          user: found
        };
        setItem("mock_auth_user", JSON.stringify(found));
        setItem("mock_auth_session", JSON.stringify(session));
        
        // Notifica i listener
        authListeners.forEach(cb => cb("SIGNED_IN", session));
        return { data: { session, user: found }, error: null };
      },

      signOut: async () => {
        removeItem("mock_auth_user");
        removeItem("mock_auth_session");
        authListeners.forEach(cb => cb("SIGNED_OUT", null));
        return { error: null };
      },

      signInWithOAuth: async ({ provider, options }) => {
        await new Promise(r => setTimeout(r, 400));
        // Controlla se l'utente Google esiste già, altrimenti lo crea
        const users = getMockTable("users");
        let googleUser = users.find(u => u.id === "usr-google-123");
        if (!googleUser) {
          googleUser = {
            id: "usr-google-123",
            email: "demo.user@gmail.com",
            user_metadata: { display_name: "Utente Google Demo" }
          };
          users.push(googleUser);
          saveMockTable("users", users);
        }
        const session = {
          access_token: `tok-google-${Date.now()}`,
          user: googleUser
        };
        setItem("mock_auth_user", JSON.stringify(googleUser));
        setItem("mock_auth_session", JSON.stringify(session));
        
        // Notifica i listener con un micro-delay per permettere a React di
        // processare lo state update nel prossimo tick
        setTimeout(() => {
          authListeners.forEach(cb => cb("SIGNED_IN", session));
        }, 50);
        return { data: { session, user: googleUser }, error: null };
      },

      getUser: async () => {
        return { data: { user: getMockUser() }, error: null };
      },

      getSession: async () => {
        try {
          const s = getItem("mock_auth_session");
          return { data: { session: s ? JSON.parse(s) : null }, error: null };
        } catch {
          return { data: { session: null }, error: null };
        }
      },

      onAuthStateChange: (callback) => {
        authListeners.add(callback);
        // Esegue subito un trigger con la sessione attuale
        try {
          const s = getItem("mock_auth_session");
          callback(s ? "SIGNED_IN" : "INITIAL_SESSION", s ? JSON.parse(s) : null);
        } catch {
          callback("INITIAL_SESSION", null);
        }
        return {
          data: {
            subscription: {
              unsubscribe: () => authListeners.delete(callback)
            }
          }
        };
      }
    },

    // Builder query mock per simulare supabase-js
    from: (table) => {
      let data = getMockTable(table);
      let queryResult = [...data];

      const chain = {
        select: (columns = "*") => {
          return chain;
        },
        eq: (col, val) => {
          queryResult = queryResult.filter(row => {
            if (col === "event_id") return row.event_id === val;
            if (col === "id") return row.id === val;
            if (col === "user_id") return row.user_id === val;
            return row[col] === val;
          });
          return chain;
        },
        single: () => {
          return { data: queryResult[0] || null, error: queryResult[0] ? null : { message: "Non trovato", code: "PGRST116" } };
        },
        order: (col, { ascending = true } = {}) => {
          queryResult.sort((a, b) => {
            if (a[col] < b[col]) return ascending ? -1 : 1;
            if (a[col] > b[col]) return ascending ? 1 : -1;
            return 0;
          });
          return chain;
        },
        insert: async (rows) => {
          await new Promise(r => setTimeout(r, 200));
          const arr = Array.isArray(rows) ? rows : [rows];
          const newRows = arr.map(r => ({
            id: r.id || `rec-${Math.random().toString(36).substr(2, 9)}`,
            created_at: new Date().toISOString(),
            ...r
          }));
          const currentData = getMockTable(table);
          saveMockTable(table, [...currentData, ...newRows]);
          return { data: newRows, error: null };
        },
        update: async (updates) => {
          await new Promise(r => setTimeout(r, 200));
          const currentData = getMockTable(table);
          let updatedRows = [];
          const newData = currentData.map(row => {
            const isMatch = queryResult.some(q => q.id === row.id);
            if (isMatch) {
              const updated = { ...row, ...updates };
              updatedRows.push(updated);
              return updated;
            }
            return row;
          });
          saveMockTable(table, newData);
          return { data: updatedRows, error: null };
        },
        upsert: async (rows) => {
          await new Promise(r => setTimeout(r, 200));
          const arr = Array.isArray(rows) ? rows : [rows];
          const currentData = getMockTable(table);
          let updatedIds = new Set();
          
          const newData = currentData.map(row => {
            const match = arr.find(item => 
              (item.id && item.id === row.id) ||
              (item.event_id === row.event_id && item.user_id === row.user_id)
            );
            if (match) {
              updatedIds.add(match.id || `${match.event_id}-${match.user_id}`);
              return { ...row, ...match };
            }
            return row;
          });

          const newInserts = arr.filter(item => 
            !updatedIds.has(item.id) && 
            !currentData.some(row => 
              (item.id && item.id === row.id) ||
              (item.event_id === row.event_id && item.user_id === row.user_id)
            )
          ).map(item => ({
            id: item.id || `rec-${Math.random().toString(36).substr(2, 9)}`,
            created_at: new Date().toISOString(),
            ...item
          }));

          const finalData = [...newData, ...newInserts];
          saveMockTable(table, finalData);
          return { data: [...arr], error: null };
        },
        delete: async () => {
          await new Promise(r => setTimeout(r, 200));
          const currentData = getMockTable(table);
          const newData = currentData.filter(row => {
            return !queryResult.some(q => q.id === row.id);
          });
          saveMockTable(table, newData);
          return { data: queryResult, error: null };
        },
        then: (onfulfilled) => {
          return Promise.resolve({ data: queryResult, error: null }).then(onfulfilled);
        }
      };

      return chain;
    },

    channel: (name) => {
      const channelObj = {
        on: (event, filter, callback) => {
          const handler = (e) => {
            if (e.key && e.key.startsWith("mock_db_")) {
              callback({
                new: {},
                eventType: "UPDATE"
              });
            }
          };
          window.addEventListener("storage", handler);
          channelObj._handler = handler;
          channelObj.unsubscribe = () => {
            window.removeEventListener("storage", handler);
          };
          return channelObj;
        },
        subscribe: (cb) => {
          if (cb) cb("SUBSCRIBED");
          return channelObj;
        },
        unsubscribe: () => {},
        _handler: null
      };
      return channelObj;
    },

    removeChannel: (channel) => {
      if (channel && typeof channel.unsubscribe === "function") {
        channel.unsubscribe();
      }
    }
  };
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };
