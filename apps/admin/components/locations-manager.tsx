"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@darb-rest/i18n";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Modal,
} from "@darb-rest/ui";
import {
  IconBuilding,
  IconPlus,
  IconMapPin,
  IconClock,
  IconCheck,
  IconWarning,
} from "@darb-rest/icons";
import { normalizeSlug, type BranchLocationCreateInput } from "@darb-rest/validation";
import {
  createBranchAction,
  updateBranchAction,
  setActiveBranchAction,
} from "../lib/actions/locations";
import type { BranchLocation, TenantRole, ResolvedEntitlements } from "@darb-rest/types";

export interface LocationsManagerProps {
  businessId: string;
  businessSlug: string;
  userRole: TenantRole;
  locations: BranchLocation[];
  activeLocationId: string | null;
  entitlements: ResolvedEntitlements;
}

export function LocationsManager({
  businessId,
  userRole,
  locations,
  activeLocationId,
  entitlements,
}: LocationsManagerProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isMutationAllowed = ["owner", "admin", "manager"].includes(userRole);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchLocation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add Branch Form State
  const [addName, setAddName] = useState("");
  const [addSlug, setAddSlug] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addAddress, setAddAddress] = useState("");
  const [addCity, setAddCity] = useState("");
  const [addCountry, setAddCountry] = useState("IL");
  const [addIsPrimary, setAddIsPrimary] = useState(false);

  // Edit Branch Form State
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");

  const handleOpenAdd = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setAddName("");
    setAddSlug("");
    setAddPhone("");
    setAddEmail("");
    setAddAddress("");
    setAddCity("");
    setAddCountry("IL");
    setAddIsPrimary(false);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (branch: BranchLocation) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setEditingBranch(branch);
    const displayName =
      typeof branch.name === "object"
        ? branch.name[locale] || Object.values(branch.name)[0] || ""
        : String(branch.name);
    setEditName(displayName);
    setEditPhone(branch.phone || "");
    setEditEmail(branch.email || "");
    setEditAddress(branch.addressLine1);
    setEditCity(branch.city);
  };

  const handleSetActive = (locationId: string) => {
    startTransition(async () => {
      await setActiveBranchAction(locationId);
      router.refresh();
    });
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!addName.trim() || !addAddress.trim() || !addCity.trim()) {
      setErrorMessage(t("validation.required"));
      return;
    }

    startTransition(async () => {
      const payload: BranchLocationCreateInput = {
        businessId,
        slug: normalizeSlug(addSlug || addName),
        name: {
          ar: addName,
          he: addName,
          en: addName,
        },
        phone: addPhone || undefined,
        email: addEmail || undefined,
        addressLine1: addAddress,
        city: addCity,
        country: addCountry,
        isPrimary: addIsPrimary,
        status: "active",
      };

      const res = await createBranchAction(payload);
      if (res.success) {
        setIsAddOpen(false);
        setSuccessMessage(t("locations.branchCreated"));
        router.refresh();
      } else {
        setErrorMessage(res.error || t("common.error"));
      }
    });
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;
    setErrorMessage(null);

    startTransition(async () => {
      const res = await updateBranchAction(editingBranch.id, {
        name: {
          ar: editName,
          he: editName,
          en: editName,
        },
        phone: editPhone || undefined,
        email: editEmail || undefined,
        addressLine1: editAddress,
        city: editCity,
      });

      if (res.success) {
        setEditingBranch(null);
        setSuccessMessage(t("locations.branchUpdated"));
        router.refresh();
      } else {
        setErrorMessage(res.error || t("common.error"));
      }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Action Notifications */}
      {successMessage && (
        <div className="rounded-xl border border-[var(--color-success)]/40 bg-[var(--color-success-bg)] p-3.5 text-xs text-[var(--color-success)] flex items-center gap-2 shadow-xs">
          <IconCheck size={16} />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-[var(--color-destructive)]/40 bg-[var(--color-destructive-bg)] p-3.5 text-xs text-[var(--color-destructive)] flex items-center gap-2 shadow-xs">
          <IconWarning size={16} />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--fg-default)]">
            {t("locations.title")}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--fg-muted)] mt-1">
            {t("locations.subtitle")}
          </p>
        </div>

        {isMutationAllowed && (
          <div className="flex items-center gap-2">
            {!entitlements.multi_location.enabled && locations.length >= 1 ? (
              <Badge variant="warning" className="text-xs px-3 py-1">
                {t("locations.planLimitReached")}
              </Badge>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={handleOpenAdd}
                startIcon={<IconPlus size={16} />}
              >
                {t("locations.addBranch")}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Locations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {locations.map((branch) => {
          const displayName =
            typeof branch.name === "object"
              ? branch.name[locale] || Object.values(branch.name)[0] || ""
              : String(branch.name);
          const isActive = branch.id === activeLocationId;
          const hoursCount = branch.operatingHours?.filter((h) => !h.isClosed).length || 7;

          return (
            <Card
              key={branch.id}
              className={`rounded-2xl transition-all duration-200 flex flex-col justify-between ${
                isActive
                  ? "border-2 border-[var(--color-primary)] bg-[var(--bg-surface)] shadow-md"
                  : "border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-xs hover:border-[var(--border-hover)]"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] shrink-0">
                      <IconBuilding size={18} />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">{displayName}</CardTitle>
                      <span className="text-[11px] text-[var(--fg-muted)]" dir="ltr">
                        rest.darb.co.il/{branch.slug}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {branch.isPrimary && (
                      <Badge variant="primary" className="text-[10px] font-semibold">
                        {t("locations.primaryBranch")}
                      </Badge>
                    )}
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-success)] bg-[var(--color-success-bg)] px-2.5 py-0.5 rounded-full">
                        <IconCheck size={11} />
                        <span>{t("locations.activeBranchBadge")}</span>
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-1 flex-1 flex flex-col justify-between">
                <div className="text-xs space-y-2 text-[var(--fg-muted)] bg-[var(--bg-surface-elevated)] p-3 rounded-xl">
                  <div className="flex items-center gap-2">
                    <IconMapPin size={14} className="shrink-0 text-[var(--color-primary)]" />
                    <span className="truncate">
                      {branch.addressLine1}, {branch.city}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IconClock size={14} className="shrink-0 text-[var(--color-primary)]" />
                    <span>{hoursCount} / 7 days active</span>
                  </div>
                  {branch.phone && (
                    <div className="text-[11px] text-[var(--fg-muted)] ps-5.5" dir="ltr">
                      {branch.phone}
                    </div>
                  )}
                </div>

                <div className="border-t border-[var(--border-subtle)] pt-3.5 flex items-center justify-between gap-2">
                  <div>
                    {!isActive ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetActive(branch.id)}
                        disabled={isPending}
                      >
                        {t("locations.setAsActive")}
                      </Button>
                    ) : (
                      <span className="text-xs font-semibold text-[var(--color-success)] flex items-center gap-1">
                        <IconCheck size={14} />
                        {t("locations.activeBranchBadge")}
                      </span>
                    )}
                  </div>

                  {isMutationAllowed && (
                    <Button size="sm" variant="outline" onClick={() => handleOpenEdit(branch)}>
                      {t("common.edit")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Branch Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={t("locations.addBranch")}
      >
        <form onSubmit={handleSubmitAdd} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--fg-default)]">
              {t("locations.branchName")} *
            </label>
            <Input
              value={addName}
              onChange={(e) => {
                setAddName(e.target.value);
                if (!addSlug) setAddSlug(normalizeSlug(e.target.value));
              }}
              placeholder="e.g. Carmel Branch"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--fg-default)]">
              {t("locations.branchSlug")} *
            </label>
            <Input
              dir="ltr"
              value={addSlug}
              onChange={(e) => setAddSlug(normalizeSlug(e.target.value))}
              placeholder="carmel-branch"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-[var(--fg-default)]">
                {t("locations.address")} *
              </label>
              <Input
                value={addAddress}
                onChange={(e) => setAddAddress(e.target.value)}
                placeholder="Moriah Ave 45"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--fg-default)]">
                {t("locations.city")} *
              </label>
              <Input
                value={addCity}
                onChange={(e) => setAddCity(e.target.value)}
                placeholder="Haifa"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--fg-muted)] font-medium">
                {t("locations.phone")}
              </label>
              <Input
                dir="ltr"
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                placeholder="+972 4 800 0003"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--fg-muted)] font-medium">
                {t("locations.email")}
              </label>
              <Input
                dir="ltr"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="carmel@restaurant.com"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs pt-1">
            <input
              type="checkbox"
              checked={addIsPrimary}
              onChange={(e) => setAddIsPrimary(e.target.checked)}
              className="h-4 w-4 rounded-md border-[var(--border-default)] text-[var(--color-primary)]"
            />
            <span className="text-[var(--fg-default)] font-medium">
              {t("locations.primaryBranch")}
            </span>
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--border-subtle)]">
            <Button type="button" variant="outline" size="md" onClick={() => setIsAddOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isPending}>
              {t("common.create")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Branch Modal */}
      <Modal
        isOpen={Boolean(editingBranch)}
        onClose={() => setEditingBranch(null)}
        title={t("locations.editBranch")}
      >
        <form onSubmit={handleSubmitEdit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--fg-default)]">
              {t("locations.branchName")} *
            </label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--fg-default)]">
                {t("locations.address")} *
              </label>
              <Input
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--fg-default)]">
                {t("locations.city")} *
              </label>
              <Input value={editCity} onChange={(e) => setEditCity(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--fg-muted)] font-medium">
                {t("locations.phone")}
              </label>
              <Input dir="ltr" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--fg-muted)] font-medium">
                {t("locations.email")}
              </label>
              <Input dir="ltr" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--border-subtle)]">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setEditingBranch(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isPending}>
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
