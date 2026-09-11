<script>
	import { page } from '$app/state';
	import { mock, toggleSaveCandidate } from '$lib/stores/mock.js';
	import { showToast } from '$lib/stores/toast.js';
	import HexChart from '$lib/components/HexChart.svelte';

	const id = Number(page.params.id);
	const c = $derived($mock.candidates.find((x) => x.id === id));
</script>

<svelte:head><title>{c?.name || '후보'} · WORKLEVEL</title></svelte:head>

{#if !c}
	<div class="empty">찾을 수 없어요</div>
{:else}
	<div class="hdr">
		<div style="display:flex;gap:16px;align-items:center">
			<div class="avatar lg">{c.name.slice(1)}</div>
			<div>
				<div class="eyebrow">{c.exp} · {c.avail} · {c.area}</div>
				<h1>{c.name}</h1>
			</div>
		</div>
		<div class="acts">
			<button class="btn o" onclick={() => toggleSaveCandidate(c.id)}>{c.saved ? '찜 해제' : '찜하기'}</button>
			<button class="btn p" onclick={() => showToast('면접 제안 기능은 아직 없어요')}>면접 제안</button>
		</div>
	</div>

	<div class="cols eq">
		<div>
			<div class="card w">
				<div class="sec-h" style="margin-bottom:8px"><h3>근무 기록 · 숫자로만</h3></div>
				<div class="hours2">
					<div class="v"><b class="num">{c.hours.toLocaleString()}h</b><span>앱으로 확인된 근무시간</span></div>
					<div class="u"><b class="num">{c.self ? c.self.toLocaleString() + 'h' : '—'}</b><span>이전 경력 · 확인 전</span></div>
				</div>
				<div class="kv x3" style="margin-bottom:0">
					<div><b class="num">{c.months}개월</b><span>카페 근무 기간</span></div>
					<div><b class="num">{c.ontime}%</b><span>정시출근율</span></div>
					<div><b class="num">{c.rehire ? '있음' : '조건부'}</b><span>재채용 의향</span></div>
				</div>
			</div>
			<div class="sec">
				<div class="sec-h"><h3>기록을 보여주기로 한 매장</h3></div>
				{#each c.stores as s (s)}<div class="doc"><div class="t">{s}</div><span class="pill ok">앱 기록</span></div>{/each}
			</div>
		</div>
		<div>
			<div class="card w">
				<div class="sec-h" style="margin-bottom:0"><h3>이전 사장님 평가 <span class="tiny muted">· 참고용</span></h3></div>
				<div class="hex-wrap"><HexChart values={c.hex} /></div>
			</div>
			<div class="sec">
				<div class="sec-h"><h3>할 수 있는 일 · 교육</h3></div>
				<div class="opts">{#each [...c.jobs, ...c.edu] as j (j)}<span class="kind" style="height:30px;display:inline-flex;align-items:center;padding:0 10px">{j}</span>{/each}</div>
			</div>
		</div>
	</div>
{/if}
