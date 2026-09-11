<script>
	import { mock } from '$lib/stores/mock.js';

	let tab = $state('all');
	const list = $derived(tab === 'saved' ? $mock.candidates.filter((c) => c.saved) : $mock.candidates);
</script>

<svelte:head><title>사람 구하기 · WORKLEVEL</title></svelte:head>

<div class="hdr">
	<div>
		<div class="eyebrow">이전 매장 기록을 보여주기로 한 사람 {$mock.candidates.length}명<span class="mock-badge">목업 · 미구현 기능</span></div>
		<h1>사람 구하기</h1>
	</div>
	<div class="acts">
		<div class="seg lg">
			<button class={tab === 'all' ? 'on' : ''} onclick={() => (tab = 'all')}>전체</button>
			<button class={tab === 'saved' ? 'on' : ''} onclick={() => (tab = 'saved')}>찜한 사람 {$mock.candidates.filter((c) => c.saved).length}</button>
		</div>
	</div>
</div>

<p class="note" style="margin-bottom:16px">
	실제 백엔드에는 아직 이 기능이 없어요(SPEC_VS_IMPL.md 기준 "시기 상조로 미구현"). 화면 구조만 프로토타입에서 그대로 옮겨왔어요.
</p>

<div class="cands">
	{#each list as c (c.id)}
		<a class="cand" href={`/owner/talent/${c.id}`}>
			<div style="flex:none;text-align:center;width:84px">
				<div class="num" style="font-size:26px;font-weight:500;color:var(--carbon);line-height:1">{c.ontime}%</div>
				<div class="tiny muted">정시출근</div>
				<div class="num" style="font-size:15px;font-weight:500;color:var(--carbon);margin-top:8px">{c.hours.toLocaleString()}h</div>
				<div class="tiny muted">확인된 시간</div>
			</div>
			<div class="main">
				<div class="t">{c.name}{c.saved ? ' 찜' : ''}</div>
				<div class="s num">{c.exp} · {c.area} · 이전 사장님 재채용 의향 {c.rehire ? '있음' : '조건부'}</div>
				<div class="tags">{#each c.jobs as j (j)}<span>{j}</span>{/each}<span>{c.avail}</span></div>
			</div>
		</a>
	{:else}
		<div class="empty" style="grid-column:1/-1">조건에 맞는 사람이 없어요.</div>
	{/each}
</div>
