<script lang="ts">
  import SearchButton from '#lib/components/shared-components/search-bar/SearchButton.svelte';
  import { searchManager } from '#lib/managers/search-manager.svelte.ts';
  import { AssetOrder } from '@immich/sdk';
  import { Field, HelperText, NumberInput, Text } from '@immich/ui';
  import { t } from 'svelte-i18n';

  const isSmartSearch = $derived(searchManager.filter.queryType === 'smart' || !!searchManager.filter.queryAssetId);
</script>

<div class="flex flex-col gap-5">
  <fieldset>
    <Text class="my-5" fontWeight="medium">{$t('search_sort_order')}</Text>
    <div class="flex flex-wrap gap-2">
      {#if isSmartSearch}
        <SearchButton
          checked
          active={searchManager.filter.order === undefined}
          onclick={() => (searchManager.filter.order = undefined)}
        >
          {$t('search_relevance')}
        </SearchButton>
      {/if}
      <SearchButton
        checked
        active={searchManager.filter.order === AssetOrder.Desc || (!isSmartSearch && !searchManager.filter.order)}
        onclick={() => (searchManager.filter.order = AssetOrder.Desc)}
      >
        {$t('newest_first')}
      </SearchButton>
      <SearchButton
        checked
        active={searchManager.filter.order === AssetOrder.Asc}
        onclick={() => (searchManager.filter.order = AssetOrder.Asc)}
      >
        {$t('oldest_first')}
      </SearchButton>
    </div>
  </fieldset>
  {#if isSmartSearch}
    <Field label={$t('search_minimum_score')}>
      <NumberInput min={-1} max={1} step={0.01} bind:value={searchManager.filter.minScore} />
      <HelperText>{$t('search_minimum_score_description')}</HelperText>
    </Field>
  {/if}
</div>
