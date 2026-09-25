<script>
	import { onDestroy, untrack } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores/session.js';
	import { getManualItem, createManualItem, updateManualItem, deleteManualItem } from '$lib/api/manualItem.js';
	import { uploadFile, retryAfterUpload } from '$lib/api/s3file.js';
	import ProtectedThumb from '$lib/components/ProtectedThumb.svelte';
	import { confirmBox } from '$lib/stores/confirm.js';
	import { showToast } from '$lib/stores/toast.js';

	// /new에서 등록하면 같은 라우트(/[id])로 goto하므로 컴포넌트가 재사용된다 - params를 반응형으로 읽어야
	// 등록 직후 새로고침 없이 보기 화면으로 바뀐다.
	const idParam = $derived(page.params.id);
	const isNew = $derived(idParam === 'new');

	let nameKo = $state('');
	let nameEn = $state('');
	let precautions = $state('');
	let ingredients = $state([{ name: '', amount: '' }]);
	let steps = $state(['']);
	let loading = $state(false);
	/** 등록된 레시피는 보기 화면이 기본이고 "수정"을 눌렀을 때만 입력 폼을 보여준다 */
	let editing = $state(false);
	/** 서버에 저장된 값(보기 화면 표시 + 수정 취소 시 되돌리기용) */
	let item = $state(/** @type {any} */ (null));
	let saving = $state(false);
	let err = $state('');
	let updatedAt = $state('');

	/** 이미 저장된 썸네일(PROTECTED, CDN으로 봄) */
	let thumbnailS3FileId = $state(/** @type {number | null} */ (null));
	/** 새로 고른 파일(저장 전엔 아직 업로드 안 함) + 로컬 미리보기 */
	let thumbnailFile = $state(/** @type {File | null} */ (null));
	let thumbnailPreviewUrl = $state('');

	/** 입력 폼을 저장된 값으로 채운다(수정 취소 시에도 씀) */
	function fillForm() {
		const c = item.content;
		nameKo = c.nameKo;
		nameEn = c.nameEn;
		precautions = c.precautions;
		ingredients = c.ingredients?.length ? c.ingredients.map((i) => ({ ...i })) : [{ name: '', amount: '' }];
		steps = c.steps?.length ? [...c.steps] : [''];
		updatedAt = item.updatedAt;
		thumbnailS3FileId = item.thumbnailS3FileId ?? null;
		clearPickedThumbnail();
	}

	async function load(id) {
		loading = true;
		err = '';
		try {
			item = await getManualItem($session.storeId, id);
			fillForm();
		} catch (e) {
			err = e?.message || '불러오기에 실패했어요';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		const id = idParam;
		untrack(() => {
			if (id === 'new') {
				item = null;
				nameKo = nameEn = precautions = updatedAt = '';
				ingredients = [{ name: '', amount: '' }];
				steps = [''];
				thumbnailS3FileId = null;
				clearPickedThumbnail();
				editing = true;
			} else {
				editing = false;
				load(Number(id));
			}
		});
	});

	function clearPickedThumbnail() {
		if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
		thumbnailFile = null;
		thumbnailPreviewUrl = '';
	}
	onDestroy(clearPickedThumbnail);

	function cancelEdit() {
		fillForm();
		err = '';
		editing = false;
	}

	function onPickThumbnail(e) {
		const file = e.target.files?.[0];
		if (!file) return;
		if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
		thumbnailFile = file;
		thumbnailPreviewUrl = URL.createObjectURL(file);
	}

	function addIngredient() {
		ingredients = [...ingredients, { name: '', amount: '' }];
	}
	function removeIngredient(i) {
		ingredients = ingredients.filter((_, idx) => idx !== i);
	}
	function addStep() {
		steps = [...steps, ''];
	}
	function removeStep(i) {
		steps = steps.filter((_, idx) => idx !== i);
	}

	async function save() {
		if (!nameKo.trim()) return (err = '메뉴 이름을 적어 주세요');
		const cleanIng = ingredients.filter((i) => i.name.trim() && i.amount.trim());
		const cleanSteps = steps.map((s) => s.trim()).filter(Boolean);
		if (!cleanIng.length) return (err = '재료를 한 개 이상 적어 주세요');
		if (!cleanSteps.length) return (err = '순서를 한 개 이상 적어 주세요');
		saving = true;
		err = '';
		const content = { nameKo: nameKo.trim(), nameEn: nameEn.trim(), precautions: precautions.trim() || '-', ingredients: cleanIng, steps: cleanSteps };
		try {
			// PROTECTED로 presign 업로드부터 하고(사장님과 직원만 볼 수 있는 자료 — 계약서와 같은
			// 방식), 그 s3FileId를 manual-item 저장 요청에 실어 보낸다. 파일을 새로 안 고르면
			// 필드 자체를 생략해서(undefined) 기존 썸네일을 그대로 둔다.
			const newThumbId = thumbnailFile ? await uploadFile(thumbnailFile, 'PROTECTED') : undefined;
			const payload = { title: nameKo.trim(), thumbnailS3FileId: newThumbId, category: 'RECIPE', displayType: 'RECIPE', content };
			if (isNew) {
				const create = () => createManualItem($session.storeId, payload);
				const created = await (newThumbId ? retryAfterUpload(create) : create());
				showToast('등록했어요');
				await goto(`/owner/recipes/${created.id}`);
			} else {
				const update = () => updateManualItem($session.storeId, Number(idParam), payload);
				await (newThumbId ? retryAfterUpload(update) : update());
				showToast('저장했어요');
				await load(Number(idParam));
				editing = false;
			}
		} catch (e) {
			err = e?.message || '저장에 실패했어요';
		} finally {
			saving = false;
		}
	}

	function onDelete() {
		confirmBox('이 레시피를 지울까요?', '직원 화면에서도 사라져요.', '지우기', async () => {
			await deleteManualItem($session.storeId, Number(idParam));
			showToast('지웠어요');
			goto('/owner/recipes');
		}, true);
	}
</script>

<svelte:head><title>{isNew ? '레시피 추가' : item?.content?.nameKo || '레시피'} · WORKLEVEL</title></svelte:head>

{#if loading}
	<div class="empty">불러오는 중…</div>
{:else if !isNew && !item}
	<div class="empty">{err || '레시피를 찾을 수 없어요'}</div>
{:else if !editing}
	{@const c = item.content}
	<div class="hdr">
		<div>
			<div class="eyebrow">{c.nameEn ? `${c.nameEn} · ` : ''}수정됨 {item.updatedAt?.slice(0, 10)}</div>
			<h1>{c.nameKo}</h1>
		</div>
		<div class="acts">
			<a class="btn s" href="/owner/recipes">목록</a>
			<button class="btn d" onclick={onDelete}>삭제</button>
			<button class="btn p" onclick={() => (editing = true)}>수정</button>
		</div>
	</div>
	<div class="cols eq">
		<div>
			<div class="card" style="height:320px;overflow:hidden;display:flex;align-items:center;justify-content:center">
				{#if item.thumbnailS3FileId}
					<div style="width:100%;height:100%"><ProtectedThumb s3FileId={item.thumbnailS3FileId} /></div>
				{:else}
					<div style="width:120px;height:135px"><ProtectedThumb s3FileId={null} /></div>
				{/if}
			</div>
			{#if c.precautions && c.precautions !== '-'}<div class="note" style="margin-top:12px"><b style="font-weight:500;color:var(--carbon)">주의</b><br />{c.precautions}</div>{/if}
		</div>
		<div>
			<div class="sec">
				<div class="sec-h"><h3>재료 · 양</h3></div>
				<div class="rows">
					{#each c.ingredients ?? [] as ing, i (i)}
						<div class="row" style="padding:10px 0"><div class="main">{ing.name} · {ing.amount}</div></div>
					{/each}
				</div>
			</div>
			<div class="sec">
				<div class="sec-h"><h3>만드는 순서</h3></div>
				<ol class="steps">{#each c.steps ?? [] as st, i (i)}<li>{st}</li>{/each}</ol>
			</div>
		</div>
	</div>
{:else}
	<div class="hdr">
		<div>
			<div class="eyebrow">{isNew ? '새 레시피' : `수정됨 ${updatedAt?.slice(0, 10)}`}</div>
			<h1>{isNew ? '레시피 추가' : nameKo}</h1>
		</div>
		<div class="acts">
			{#if isNew}<a class="btn s" href="/owner/recipes">취소</a>{:else}<button class="btn s" onclick={cancelEdit}>취소</button>{/if}
			<button class="btn p" disabled={saving} onclick={save}>{isNew ? '등록하기' : '저장하기'}</button>
		</div>
	</div>

	<div class="cols eq">
		<div>
			<div class="f">
				<label>메뉴 사진</label>
				<div class="cup" style="width:160px;border-radius:4px">
					{#if thumbnailPreviewUrl}
						<img class="thumb-img" src={thumbnailPreviewUrl} alt="" />
					{:else}
						<ProtectedThumb s3FileId={thumbnailS3FileId} />
					{/if}
				</div>
				<input type="file" accept="image/*" onchange={onPickThumbnail} style="margin-top:8px" />
			</div>
			<div class="f"><div class="inline">
				<div class="f" style="margin:0"><label>메뉴 이름</label><input bind:value={nameKo} placeholder="아인슈페너" /></div>
				<div class="f" style="margin:0"><label>영문 (선택)</label><input bind:value={nameEn} placeholder="Einspänner" /></div>
			</div></div>
			<div class="f"><label>주의할 점</label><input bind:value={precautions} placeholder="크림은 당일 제조분만" /></div>
		</div>
		<div>
			<div class="f">
				<label>재료 · 양</label>
				{#each ingredients as ing, i (i)}
					<div class="inline" style="margin-bottom:6px">
						<input bind:value={ing.name} placeholder="재료명" />
						<input bind:value={ing.amount} placeholder="양" style="max-width:120px" />
						<button class="btn s sm" onclick={() => removeIngredient(i)}>빼기</button>
					</div>
				{/each}
				<button class="btn o sm" onclick={addIngredient}>+ 재료 추가</button>
			</div>
			<div class="f">
				<label>만드는 순서</label>
				{#each steps as _, i (i)}
					<div class="inline" style="margin-bottom:6px">
						<input bind:value={steps[i]} placeholder={`순서 ${i + 1}`} />
						<button class="btn s sm" onclick={() => removeStep(i)}>빼기</button>
					</div>
				{/each}
				<button class="btn o sm" onclick={addStep}>+ 순서 추가</button>
			</div>
		</div>
	</div>
	{#if err}<p class="f err">{err}</p>{/if}
{/if}
