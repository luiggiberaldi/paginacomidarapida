import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

export function useCatalog(slug) {
  const [catalog, setCatalog] = useState([]);
  const [config, setConfig] = useState({
    business_name: "Cargando...",
    is_open: true,
    whatsapp_number: "",
    tenant_id: null,
  });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let catalogSub;

    const init = async () => {
      setLoading(true);
      try {
        // 1. Look up tenant by slug
        const { data: configData, error: configError } = await supabase
          .from("web_config")
          .select("*")
          .eq("slug", slug)
          .single();

        if (configError || !configData) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setConfig(configData);
        const tenantId = configData.tenant_id;

        // 2. Fetch catalog filtered by tenant
        const { data: catalogData } = await supabase
          .from("web_catalog")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("is_available", true)
          .order("category", { ascending: true })
          .order("name", { ascending: true });

        if (catalogData) {
          setCatalog(catalogData);
        }

        // 3. Subscribe to realtime changes filtered by tenant
        catalogSub = supabase
          .channel(`catalog-${tenantId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "web_catalog",
              filter: `tenant_id=eq.${tenantId}`,
            },
            () => {
              // Refresh catalog on any change
              fetchCatalog(tenantId);
            },
          )
          .subscribe();
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchCatalog = async (tenantId) => {
      const { data: catalogData } = await supabase
        .from("web_catalog")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_available", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (catalogData) {
        setCatalog(catalogData);
      }
    };

    init();

    return () => {
      if (catalogSub) supabase.removeChannel(catalogSub);
    };
  }, [slug]);

  return { catalog, config, loading, notFound };
}
