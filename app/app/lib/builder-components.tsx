// @ts-nocheck
"use client";
import type { RegisteredComponent } from "@builder.io/sdk-react";
import dynamic from "next/dynamic";

const HubPage     = dynamic(() => import("@/app/components/HubPage"));
const VaultClient = dynamic(() => import("@/app/components/VaultClient"));
const VitrineClient = dynamic(() => import("@/app/components/VitrineClient"));
const AuditorClient = dynamic(() => import("@/app/components/AuditorClient"));
const DocClient   = dynamic(() => import("@/app/components/DocClient"));

export const BUILDER_CUSTOM_COMPONENTS: RegisteredComponent[] = [
  {
    component: HubPage,
    name: "NCFN Hub",
    friendlyName: "Hub Principal",
    image: "https://cdn.builder.io/api/v1/image/assets%2FYJIGb4i01jvw0SRdL5Bt%2F085d8afb16584fb5b0c1f7e0bfb8dd97",
    inputs: [],
  },
  {
    component: VaultClient,
    name: "NCFN Vault",
    friendlyName: "Vault Forense",
    image: "https://cdn.builder.io/api/v1/image/assets%2FYJIGb4i01jvw0SRdL5Bt%2F085d8afb16584fb5b0c1f7e0bfb8dd97",
    inputs: [],
  },
  {
    component: VitrineClient,
    name: "NCFN Vitrine",
    friendlyName: "Vitrine Pública",
    image: "https://cdn.builder.io/api/v1/image/assets%2FYJIGb4i01jvw0SRdL5Bt%2F085d8afb16584fb5b0c1f7e0bfb8dd97",
    inputs: [],
  },
  {
    component: AuditorClient,
    name: "NCFN Auditor",
    friendlyName: "Auditor Online",
    image: "https://cdn.builder.io/api/v1/image/assets%2FYJIGb4i01jvw0SRdL5Bt%2F085d8afb16584fb5b0c1f7e0bfb8dd97",
    inputs: [],
  },
  {
    component: DocClient,
    name: "NCFN Doc",
    friendlyName: "Base de Conhecimento",
    image: "https://cdn.builder.io/api/v1/image/assets%2FYJIGb4i01jvw0SRdL5Bt%2F085d8afb16584fb5b0c1f7e0bfb8dd97",
    inputs: [],
  },
];
