# 第十四章：战斗系统

## 本章目标

通过本章学习，你将掌握：

1. 设计基于组件的战斗系统架构
2. 实现生命系统（IDamageable 接口、HealthComponent 组件）
3. 构建近战攻击系统（碰撞检测、攻击连击）
4. 实现远程攻击（投射物生成和轨迹计算）
5. 编写伤害计算公式（基础伤害、防御减免、暴击判定）
6. 制作打击感反馈（视觉特效、屏幕震动、顿帧效果）
7. 实现敌人 AI 状态机（空闲、巡逻、追击、攻击、逃跑、死亡）
8. 构建锁定目标系统
9. 实现闪避/翻滚机制
10. 制作冷却系统
11. 构建战斗 UI（敌人血条、伤害数字）
12. 实现死亡与重生机制

## 预计学习时间

**5-6 小时**

---

## 14.1 战斗系统架构总览

### 基于组件的设计思想

在 Unity 中，战斗系统应该采用**组件化**设计。每个功能模块都是独立的组件，通过接口和事件进行通信。这与前端的组件化思想完全一致：

| 前端组件化 | Unity 战斗系统组件化 |
|-----------|-------------------|
| React Component | MonoBehaviour 脚本 |
| Props / Interface | C# Interface（如 IDamageable） |
| Event Emitter | C# event / UnityEvent |
| Component Composition | GetComponent + AddComponent |
| Higher-Order Component | 接口实现 + 组件组合 |

### 核心组件关系图

```
┌──────────────────────────────────────────────────────┐
│                   IDamageable (接口)                   │
│  定义所有可受伤害对象的统一接口                          │
└────────────────┬─────────────────────────────────────┘
                 │ 实现
┌────────────────▼─────────────────────────────────────┐
│              HealthComponent                          │
│  管理血量、受伤、治疗、死亡                              │
│  适用于：玩家、敌人、可破坏物体                           │
└────────────┬───────────────┬─────────────────────────┘
             │               │
    ┌────────▼───┐    ┌──────▼──────┐
    │ MeleeAttack│    │Projectile   │
    │ 近战攻击    │    │Attack       │
    │ 碰撞检测    │    │远程投射物    │
    └──────┬─────┘    └──────┬──────┘
           │                 │
    ┌──────▼─────────────────▼──────┐
    │         CombatManager         │
    │  伤害计算、暴击判定、属性加成    │
    └──────────────┬────────────────┘
                   │
    ┌──────────────▼────────────────┐
    │          EnemyAI              │
    │  状态机：巡逻→追击→攻击→逃跑   │
    └───────────────────────────────┘
```

---

## 14.2 IDamageable 接口

```csharp
// IDamageable.cs
// 可受伤害接口 - 所有可被攻击的对象都必须实现此接口
// 这是面向接口编程的经典案例

// 前端类比：
// TypeScript 中的 interface：
// interface IDamageable {
//     takeDamage(damage: DamageInfo): void;
//     getCurrentHealth(): number;
//     getMaxHealth(): number;
//     isAlive(): boolean;
// }

using UnityEngine;

/// <summary>
/// 伤害信息结构体
/// 封装一次伤害的所有相关数据
/// </summary>
[System.Serializable]
public struct DamageInfo
{
    /// <summary>基础伤害值</summary>
    public float baseDamage;

    /// <summary>伤害来源（攻击者的 GameObject）</summary>
    public GameObject source;

    /// <summary>伤害施加点（用于特效显示位置）</summary>
    public Vector3 hitPoint;

    /// <summary>伤害方向（用于击退计算）</summary>
    public Vector3 hitDirection;

    /// <summary>是否为暴击</summary>
    public bool isCritical;

    /// <summary>伤害类型</summary>
    public DamageType damageType;

    /// <summary>最终计算后的伤害值（经过防御减免等）</summary>
    public float finalDamage;

    /// <summary>击退力度</summary>
    public float knockbackForce;
}

/// <summary>
/// 伤害类型枚举
/// </summary>
public enum DamageType
{
    /// <summary>物理伤害</summary>
    Physical,

    /// <summary>魔法伤害</summary>
    Magical,

    /// <summary>真实伤害（无视防御）</summary>
    True,

    /// <summary>环境伤害（陷阱、坠落等）</summary>
    Environmental
}

/// <summary>
/// 可受伤害接口
///
/// 为什么使用接口？
///
/// 在前端开发中，你可能习惯用 TypeScript interface 来定义契约。
/// C# 的 interface 也是同样的作用：
///
/// 1. 统一 API：不管是玩家、敌人还是木桶，只要实现 IDamageable，
///    攻击系统就能对它们造成伤害
/// 2. 解耦：攻击系统不需要知道目标的具体类型
/// 3. 多态：不同对象可以有不同的受伤表现
///
/// 使用 GetComponent<IDamageable>() 来查找实现了此接口的组件
/// </summary>
public interface IDamageable
{
    /// <summary>
    /// 受到伤害
    /// </summary>
    /// <param name="damageInfo">伤害信息</param>
    void TakeDamage(DamageInfo damageInfo);

    /// <summary>获取当前生命值</summary>
    float CurrentHealth { get; }

    /// <summary>获取最大生命值</summary>
    float MaxHealth { get; }

    /// <summary>是否存活</summary>
    bool IsAlive { get; }

    /// <summary>获取此对象的 Transform</summary>
    Transform GetTransform();
}
```

---

## 14.3 生命系统组件

```csharp
// HealthComponent.cs
// 生命系统组件 - 管理任何对象的血量
// 实现 IDamageable 接口，可挂载到玩家、敌人、可破坏物等

using System;
using UnityEngine;

/// <summary>
/// 生命系统组件
///
/// 这是战斗系统的基础组件。任何需要有"血量"概念的对象
/// 都应该添加这个组件。
///
/// 特性：
/// - 血量管理（受伤、治疗、死亡）
/// - 无敌帧（受伤后的短暂无敌时间）
/// - 事件通知（血量变化、死亡等）
/// - 击退效果
///
/// 前端类比：
/// 类似于一个有状态的 React 组件
/// state = { currentHealth, maxHealth, isInvulnerable }
/// 通过事件（类似 EventEmitter）通知外部状态变化
/// </summary>
public class HealthComponent : MonoBehaviour, IDamageable
{
    // ========== 配置 ==========

    [Header("生命值设置")]
    [Tooltip("最大生命值")]
    [SerializeField] private float maxHealth = 100f;

    [Tooltip("初始生命值（0 = 使用最大生命值）")]
    [SerializeField] private float startHealth = 0f;

    [Header("无敌帧设置")]
    [Tooltip("受伤后的无敌时间（秒）")]
    [SerializeField] private float invulnerabilityDuration = 0.5f;

    [Tooltip("无敌时是否闪烁模型")]
    [SerializeField] private bool flashOnInvulnerable = true;

    [Header("击退设置")]
    [Tooltip("是否启用击退效果")]
    [SerializeField] private bool enableKnockback = true;

    [Tooltip("默认击退力度")]
    [SerializeField] private float defaultKnockbackForce = 5f;

    [Header("死亡设置")]
    [Tooltip("死亡后多久销毁 GameObject（0 = 不自动销毁）")]
    [SerializeField] private float destroyAfterDeath = 0f;

    [Tooltip("死亡时生成的效果预制体")]
    [SerializeField] private GameObject deathEffectPrefab;

    // ========== 接口属性实现 ==========

    /// <summary>当前生命值</summary>
    public float CurrentHealth { get; private set; }

    /// <summary>最大生命值</summary>
    public float MaxHealth => maxHealth;

    /// <summary>是否存活</summary>
    public bool IsAlive => CurrentHealth > 0;

    /// <summary>生命值百分比（0-1）</summary>
    public float HealthPercent => maxHealth > 0 ? CurrentHealth / maxHealth : 0;

    /// <summary>是否处于无敌状态</summary>
    public bool IsInvulnerable { get; private set; } = false;

    // ========== 事件 ==========

    /// <summary>受到伤害事件 - 参数：(伤害信息, 剩余血量)</summary>
    public event Action<DamageInfo, float> OnDamaged;

    /// <summary>被治疗事件 - 参数：(治疗量, 当前血量)</summary>
    public event Action<float, float> OnHealed;

    /// <summary>血量变化事件 - 参数：(当前血量, 最大血量)</summary>
    public event Action<float, float> OnHealthChanged;

    /// <summary>死亡事件</summary>
    public event Action<DamageInfo> OnDeath;

    // ========== 内部组件引用 ==========

    /// <summary>刚体（用于击退）</summary>
    private Rigidbody rb;

    /// <summary>渲染器数组（用于无敌闪烁）</summary>
    private Renderer[] renderers;

    /// <summary>无敌计时器</summary>
    private float invulnerabilityTimer = 0f;

    // ========== 生命周期 ==========

    private void Awake()
    {
        // 初始化生命值
        CurrentHealth = startHealth > 0 ? startHealth : maxHealth;

        rb = GetComponent<Rigidbody>();
        renderers = GetComponentsInChildren<Renderer>();
    }

    private void Update()
    {
        // 无敌帧倒计时
        if (IsInvulnerable)
        {
            invulnerabilityTimer -= Time.deltaTime;

            // 闪烁效果
            if (flashOnInvulnerable && renderers != null)
            {
                bool visible = Mathf.Sin(Time.time * 20f) > 0;
                foreach (var r in renderers)
                {
                    r.enabled = visible;
                }
            }

            if (invulnerabilityTimer <= 0)
            {
                IsInvulnerable = false;

                // 恢复可见性
                if (renderers != null)
                {
                    foreach (var r in renderers)
                    {
                        r.enabled = true;
                    }
                }
            }
        }
    }

    // ========== IDamageable 接口实现 ==========

    /// <summary>
    /// 受到伤害
    /// </summary>
    /// <param name="damageInfo">伤害信息</param>
    public void TakeDamage(DamageInfo damageInfo)
    {
        // 检查是否存活
        if (!IsAlive)
        {
            return;
        }

        // 检查无敌帧
        if (IsInvulnerable)
        {
            Debug.Log($"[Health] {gameObject.name} 处于无敌状态，伤害无效");
            return;
        }

        // 扣除生命值
        float actualDamage = damageInfo.finalDamage;
        CurrentHealth = Mathf.Max(0, CurrentHealth - actualDamage);

        Debug.Log($"[Health] {gameObject.name} 受到 {actualDamage:F0} 点伤害" +
                  $"{(damageInfo.isCritical ? " (暴击!)" : "")}" +
                  $"，剩余 {CurrentHealth:F0}/{maxHealth}");

        // 触发受伤事件
        OnDamaged?.Invoke(damageInfo, CurrentHealth);
        OnHealthChanged?.Invoke(CurrentHealth, maxHealth);

        // 击退效果
        if (enableKnockback && rb != null)
        {
            float force = damageInfo.knockbackForce > 0
                ? damageInfo.knockbackForce
                : defaultKnockbackForce;

            Vector3 knockbackDir = damageInfo.hitDirection.normalized;
            knockbackDir.y = 0.3f; // 略微向上的击退

            rb.AddForce(knockbackDir * force, ForceMode.Impulse);
        }

        // 启用无敌帧
        if (invulnerabilityDuration > 0)
        {
            IsInvulnerable = true;
            invulnerabilityTimer = invulnerabilityDuration;
        }

        // 检查是否死亡
        if (CurrentHealth <= 0)
        {
            Die(damageInfo);
        }
    }

    /// <summary>
    /// 获取此对象的 Transform
    /// </summary>
    public Transform GetTransform()
    {
        return transform;
    }

    // ========== 治疗 ==========

    /// <summary>
    /// 恢复生命值
    /// </summary>
    /// <param name="amount">恢复量</param>
    public void Heal(float amount)
    {
        if (!IsAlive) return;

        float previousHealth = CurrentHealth;
        CurrentHealth = Mathf.Min(CurrentHealth + amount, maxHealth);

        float actualHeal = CurrentHealth - previousHealth;

        if (actualHeal > 0)
        {
            OnHealed?.Invoke(actualHeal, CurrentHealth);
            OnHealthChanged?.Invoke(CurrentHealth, maxHealth);

            Debug.Log($"[Health] {gameObject.name} 恢复了 {actualHeal:F0} 点生命值" +
                      $"，当前 {CurrentHealth:F0}/{maxHealth}");
        }
    }

    /// <summary>
    /// 设置最大生命值（装备变化等情况）
    /// </summary>
    /// <param name="newMax">新的最大生命值</param>
    /// <param name="healToFull">是否同时回满</param>
    public void SetMaxHealth(float newMax, bool healToFull = false)
    {
        maxHealth = newMax;
        if (healToFull)
        {
            CurrentHealth = maxHealth;
        }
        else
        {
            CurrentHealth = Mathf.Min(CurrentHealth, maxHealth);
        }
        OnHealthChanged?.Invoke(CurrentHealth, maxHealth);
    }

    // ========== 死亡 ==========

    /// <summary>
    /// 处理死亡
    /// </summary>
    /// <param name="killingBlow">致命一击的伤害信息</param>
    private void Die(DamageInfo killingBlow)
    {
        Debug.Log($"[Health] {gameObject.name} 死亡");

        // 触发死亡事件
        OnDeath?.Invoke(killingBlow);

        // 生成死亡特效
        if (deathEffectPrefab != null)
        {
            Instantiate(deathEffectPrefab, transform.position, Quaternion.identity);
        }

        // 禁用碰撞体
        Collider col = GetComponent<Collider>();
        if (col != null)
        {
            col.enabled = false;
        }

        // 如果设置了自动销毁时间
        if (destroyAfterDeath > 0)
        {
            Destroy(gameObject, destroyAfterDeath);
        }
    }

    /// <summary>
    /// 复活（重生时调用）
    /// </summary>
    /// <param name="healthPercent">复活后的生命值百分比（0-1）</param>
    public void Revive(float healthPercent = 1f)
    {
        CurrentHealth = maxHealth * Mathf.Clamp01(healthPercent);
        IsInvulnerable = false;

        // 重新启用碰撞体
        Collider col = GetComponent<Collider>();
        if (col != null)
        {
            col.enabled = true;
        }

        // 恢复可见性
        if (renderers != null)
        {
            foreach (var r in renderers)
            {
                r.enabled = true;
            }
        }

        OnHealthChanged?.Invoke(CurrentHealth, maxHealth);

        Debug.Log($"[Health] {gameObject.name} 复活，生命值: {CurrentHealth:F0}");
    }
}
```

[截图：HealthComponent 在 Inspector 中的配置界面]

---

## 14.4 近战攻击系统

```csharp
// MeleeAttack.cs
// 近战攻击系统 - 处理近距离物理攻击
// 支持攻击连击（combo）、碰撞检测（hitbox）、冷却时间

using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// 攻击连击定义
/// 定义连击中每一段攻击的属性
/// </summary>
[System.Serializable]
public class ComboAttack
{
    [Tooltip("此段攻击的伤害倍率")]
    public float damageMultiplier = 1f;

    [Tooltip("攻击动画 Trigger 名称")]
    public string animationTrigger = "Attack";

    [Tooltip("攻击范围")]
    public float attackRange = 2f;

    [Tooltip("攻击角度（前方多少度内有效）")]
    [Range(0, 360)]
    public float attackAngle = 90f;

    [Tooltip("此段攻击的击退力度")]
    public float knockbackForce = 3f;

    [Tooltip("攻击动画持续时间（秒）")]
    public float attackDuration = 0.4f;

    [Tooltip("攻击判定开始的时间（动画播放多久后开始检测碰撞）")]
    public float hitStartTime = 0.1f;

    [Tooltip("攻击判定结束的时间")]
    public float hitEndTime = 0.3f;

    [Tooltip("连击窗口时间（在此时间内按攻击键可接下一段）")]
    public float comboWindowDuration = 0.5f;
}

/// <summary>
/// 近战攻击组件
///
/// 工作流程：
/// 1. 玩家按下攻击键
/// 2. 播放攻击动画
/// 3. 在指定时间窗口内进行碰撞检测
/// 4. 对范围内的 IDamageable 对象造成伤害
/// 5. 在连击窗口内按攻击可接下一段
///
/// 碰撞检测方式：
/// 使用 Physics.OverlapSphere 进行范围检测，
/// 而不是依赖 OnTriggerEnter，因为这样可以更精确地控制检测时机。
///
/// 前端类比：
/// 类似于一个有状态的动画控制器
/// 使用定时器（setTimeout）来控制不同阶段的逻辑
/// </summary>
public class MeleeAttack : MonoBehaviour
{
    [Header("基础设置")]
    [Tooltip("基础攻击伤害")]
    [SerializeField] private float baseDamage = 20f;

    [Tooltip("攻击按键")]
    [SerializeField] private KeyCode attackKey = KeyCode.Mouse0;

    [Tooltip("攻击检测的层（哪些对象可被攻击）")]
    [SerializeField] private LayerMask attackableLayers;

    [Tooltip("攻击检测的原点偏移（相对于自身位置）")]
    [SerializeField] private Vector3 hitboxOffset = new Vector3(0, 1, 1);

    [Header("连击系统")]
    [Tooltip("连击序列定义")]
    [SerializeField] private List<ComboAttack> comboSequence = new List<ComboAttack>();

    [Header("冷却")]
    [Tooltip("攻击冷却时间（秒）")]
    [SerializeField] private float attackCooldown = 0.1f;

    [Header("特效")]
    [Tooltip("攻击特效预制体（剑光、挥砍等）")]
    [SerializeField] private GameObject attackVFXPrefab;

    [Tooltip("命中特效预制体")]
    [SerializeField] private GameObject hitVFXPrefab;

    [Tooltip("攻击音效")]
    [SerializeField] private AudioClip[] attackSounds;

    [Tooltip("命中音效")]
    [SerializeField] private AudioClip hitSound;

    // ========== 内部状态 ==========

    /// <summary>是否正在攻击中</summary>
    public bool IsAttacking { get; private set; } = false;

    /// <summary>当前连击段数索引</summary>
    private int currentComboIndex = 0;

    /// <summary>是否在连击窗口内接收到了下一次攻击输入</summary>
    private bool comboQueued = false;

    /// <summary>冷却计时器</summary>
    private float cooldownTimer = 0f;

    /// <summary>本次攻击已命中的对象（避免重复伤害）</summary>
    private HashSet<IDamageable> hitTargets = new HashSet<IDamageable>();

    /// <summary>组件引用</summary>
    private Animator animator;
    private AudioSource audioSource;

    // ========== 生命周期 ==========

    private void Awake()
    {
        animator = GetComponent<Animator>();
        audioSource = GetComponent<AudioSource>();

        // 如果没有定义连击序列，创建一个默认的
        if (comboSequence.Count == 0)
        {
            comboSequence.Add(new ComboAttack
            {
                damageMultiplier = 1f,
                animationTrigger = "Attack1",
                attackRange = 2f,
                attackDuration = 0.5f
            });
        }
    }

    private void Update()
    {
        // 冷却倒计时
        if (cooldownTimer > 0)
        {
            cooldownTimer -= Time.deltaTime;
        }

        // 检测攻击输入
        if (Input.GetKeyDown(attackKey))
        {
            if (!IsAttacking)
            {
                // 开始新的攻击
                TryAttack();
            }
            else
            {
                // 在攻击中按下 → 排入连击队列
                comboQueued = true;
            }
        }
    }

    // ========== 攻击逻辑 ==========

    /// <summary>
    /// 尝试发起攻击
    /// </summary>
    private void TryAttack()
    {
        // 检查冷却
        if (cooldownTimer > 0) return;

        // 开始攻击协程
        StartCoroutine(PerformAttack());
    }

    /// <summary>
    /// 执行攻击的协程
    ///
    /// 协程时间线：
    /// 0s              → 播放动画、音效、特效
    /// hitStartTime    → 开始碰撞检测
    /// hitEndTime      → 结束碰撞检测
    /// attackDuration  → 攻击动画结束
    /// comboWindow     → 连击窗口结束，重置连击
    /// </summary>
    private IEnumerator PerformAttack()
    {
        IsAttacking = true;
        comboQueued = false;
        hitTargets.Clear();

        ComboAttack currentAttack = comboSequence[currentComboIndex];

        Debug.Log($"[MeleeAttack] 执行连击第 {currentComboIndex + 1} 段");

        // 播放攻击动画
        if (animator != null)
        {
            animator.SetTrigger(currentAttack.animationTrigger);
        }

        // 播放攻击音效
        PlayAttackSound();

        // 生成攻击特效（剑光等）
        SpawnAttackVFX();

        // 等待到碰撞检测开始时间
        yield return new WaitForSeconds(currentAttack.hitStartTime);

        // --- 碰撞检测阶段 ---
        float detectDuration = currentAttack.hitEndTime - currentAttack.hitStartTime;
        float detectTimer = 0f;

        while (detectTimer < detectDuration)
        {
            DetectHits(currentAttack);
            detectTimer += Time.deltaTime;
            yield return null; // 每帧检测一次
        }

        // 等待攻击动画结束
        float remainingAnimTime = currentAttack.attackDuration - currentAttack.hitEndTime;
        if (remainingAnimTime > 0)
        {
            yield return new WaitForSeconds(remainingAnimTime);
        }

        // --- 连击窗口阶段 ---
        if (comboQueued && currentComboIndex < comboSequence.Count - 1)
        {
            // 有排队的连击输入 → 立即进入下一段
            currentComboIndex++;
            StartCoroutine(PerformAttack());
            yield break;
        }

        // 等待连击窗口
        float comboTimer = 0f;
        while (comboTimer < currentAttack.comboWindowDuration)
        {
            if (comboQueued && currentComboIndex < comboSequence.Count - 1)
            {
                currentComboIndex++;
                StartCoroutine(PerformAttack());
                yield break;
            }

            comboTimer += Time.deltaTime;
            yield return null;
        }

        // 连击窗口结束，重置状态
        currentComboIndex = 0;
        IsAttacking = false;
        cooldownTimer = attackCooldown;
    }

    /// <summary>
    /// 检测攻击范围内的目标
    ///
    /// 使用 Physics.OverlapSphere 进行球形范围检测，
    /// 然后用角度过滤出正面的目标。
    ///
    /// 前端类比：
    /// 类似于用 document.querySelectorAll 获取范围内元素，
    /// 然后用 filter 过滤出满足条件的。
    /// </summary>
    private void DetectHits(ComboAttack attack)
    {
        // 计算检测中心点
        Vector3 center = transform.position + transform.TransformDirection(hitboxOffset);

        // 球形范围检测
        Collider[] hitColliders = Physics.OverlapSphere(
            center,
            attack.attackRange,
            attackableLayers
        );

        foreach (Collider col in hitColliders)
        {
            // 跳过自己
            if (col.gameObject == gameObject) continue;

            // 检查角度（是否在攻击范围正前方）
            Vector3 dirToTarget = (col.transform.position - transform.position).normalized;
            float angle = Vector3.Angle(transform.forward, dirToTarget);

            if (angle > attack.attackAngle * 0.5f) continue;

            // 获取 IDamageable 接口
            IDamageable target = col.GetComponent<IDamageable>();
            if (target == null)
            {
                // 也检查父对象
                target = col.GetComponentInParent<IDamageable>();
            }

            if (target == null) continue;

            // 避免重复命中同一目标
            if (hitTargets.Contains(target)) continue;
            hitTargets.Add(target);

            // 计算伤害
            DamageInfo damageInfo = CombatManager.Instance != null
                ? CombatManager.Instance.CalculateDamage(
                    baseDamage * attack.damageMultiplier,
                    gameObject,
                    col.ClosestPoint(center),
                    dirToTarget,
                    DamageType.Physical,
                    attack.knockbackForce)
                : new DamageInfo
                {
                    baseDamage = baseDamage * attack.damageMultiplier,
                    finalDamage = baseDamage * attack.damageMultiplier,
                    source = gameObject,
                    hitPoint = col.ClosestPoint(center),
                    hitDirection = dirToTarget,
                    damageType = DamageType.Physical,
                    knockbackForce = attack.knockbackForce
                };

            // 造成伤害
            target.TakeDamage(damageInfo);

            // 生成命中特效
            SpawnHitVFX(damageInfo.hitPoint);

            // 播放命中音效
            if (hitSound != null && audioSource != null)
            {
                audioSource.PlayOneShot(hitSound);
            }

            // 请求顿帧效果
            if (CombatManager.Instance != null)
            {
                CombatManager.Instance.RequestHitStop(0.05f);
                CombatManager.Instance.RequestScreenShake(0.1f, 0.2f);
            }

            Debug.Log($"[MeleeAttack] 命中 {col.gameObject.name}，" +
                      $"伤害: {damageInfo.finalDamage:F0}" +
                      $"{(damageInfo.isCritical ? " 暴击!" : "")}");
        }
    }

    // ========== 特效 ==========

    /// <summary>生成攻击特效</summary>
    private void SpawnAttackVFX()
    {
        if (attackVFXPrefab != null)
        {
            Vector3 pos = transform.position + transform.TransformDirection(hitboxOffset);
            GameObject vfx = Instantiate(attackVFXPrefab, pos, transform.rotation);
            Destroy(vfx, 1f); // 1秒后自动销毁
        }
    }

    /// <summary>生成命中特效</summary>
    private void SpawnHitVFX(Vector3 position)
    {
        if (hitVFXPrefab != null)
        {
            GameObject vfx = Instantiate(hitVFXPrefab, position, Quaternion.identity);
            Destroy(vfx, 1f);
        }
    }

    /// <summary>播放攻击音效</summary>
    private void PlayAttackSound()
    {
        if (attackSounds != null && attackSounds.Length > 0 && audioSource != null)
        {
            int index = UnityEngine.Random.Range(0, attackSounds.Length);
            audioSource.PlayOneShot(attackSounds[index]);
        }
    }

    // ========== Gizmos 调试 ==========

    /// <summary>在 Scene 视图中绘制攻击范围</summary>
    private void OnDrawGizmosSelected()
    {
        if (comboSequence == null || comboSequence.Count == 0) return;

        ComboAttack attack = comboSequence[0];
        Vector3 center = transform.position + transform.TransformDirection(hitboxOffset);

        // 绘制攻击范围球
        Gizmos.color = new Color(1, 0, 0, 0.3f);
        Gizmos.DrawWireSphere(center, attack.attackRange);

        // 绘制攻击角度
        Gizmos.color = Color.red;
        float halfAngle = attack.attackAngle * 0.5f;
        Vector3 leftDir = Quaternion.Euler(0, -halfAngle, 0) * transform.forward;
        Vector3 rightDir = Quaternion.Euler(0, halfAngle, 0) * transform.forward;
        Gizmos.DrawRay(center, leftDir * attack.attackRange);
        Gizmos.DrawRay(center, rightDir * attack.attackRange);
    }
}
```

[截图：近战攻击在 Scene 视图中的 Gizmos 可视化，展示攻击范围和角度]

---

## 14.5 远程攻击系统（投射物）

```csharp
// ProjectileAttack.cs
// 远程攻击系统 - 生成投射物（箭矢、火球等）
// 投射物沿轨迹飞行，命中目标后造成伤害

using System.Collections;
using UnityEngine;

/// <summary>
/// 投射物行为脚本
/// 挂载到投射物预制体上（箭矢、火球等）
/// </summary>
public class Projectile : MonoBehaviour
{
    [Header("投射物设置")]
    [Tooltip("飞行速度")]
    public float speed = 20f;

    [Tooltip("存活时间（秒），超时自动销毁")]
    public float lifetime = 5f;

    [Tooltip("是否受重力影响（抛物线轨迹）")]
    public bool useGravity = false;

    [Tooltip("命中特效预制体")]
    public GameObject hitEffectPrefab;

    [Tooltip("是否穿透目标（不销毁继续飞行）")]
    public bool piercing = false;

    [Tooltip("最大穿透次数")]
    public int maxPierceCount = 1;

    // ========== 内部状态 ==========

    /// <summary>伤害信息（由发射者设定）</summary>
    [HideInInspector] public DamageInfo damageInfo;

    /// <summary>可攻击的层</summary>
    [HideInInspector] public LayerMask attackableLayers;

    /// <summary>发射者 GameObject（避免命中自己）</summary>
    [HideInInspector] public GameObject owner;

    /// <summary>当前穿透次数</summary>
    private int pierceCount = 0;

    /// <summary>刚体</summary>
    private Rigidbody rb;

    private void Start()
    {
        rb = GetComponent<Rigidbody>();

        if (rb != null)
        {
            rb.useGravity = useGravity;
            rb.linearVelocity = transform.forward * speed;
        }

        // 设置自动销毁
        Destroy(gameObject, lifetime);
    }

    private void Update()
    {
        // 如果没有刚体，手动移动
        if (rb == null)
        {
            transform.position += transform.forward * speed * Time.deltaTime;

            // 简单的重力模拟
            if (useGravity)
            {
                Vector3 gravity = Physics.gravity * Time.deltaTime;
                transform.position += gravity * Time.deltaTime;
                // 面朝移动方向
                transform.forward = (transform.forward + gravity * Time.deltaTime).normalized;
            }
        }
    }

    private void OnTriggerEnter(Collider other)
    {
        // 忽略发射者
        if (other.gameObject == owner) return;

        // 检测目标
        IDamageable target = other.GetComponent<IDamageable>();
        if (target == null)
            target = other.GetComponentInParent<IDamageable>();

        if (target != null)
        {
            // 更新伤害信息的命中点
            DamageInfo info = damageInfo;
            info.hitPoint = other.ClosestPoint(transform.position);
            info.hitDirection = transform.forward;

            // 造成伤害
            target.TakeDamage(info);

            Debug.Log($"[Projectile] 命中 {other.gameObject.name}，" +
                      $"伤害: {info.finalDamage:F0}");
        }

        // 生成命中特效
        if (hitEffectPrefab != null)
        {
            Vector3 hitPos = other.ClosestPoint(transform.position);
            Instantiate(hitEffectPrefab, hitPos, Quaternion.identity);
        }

        // 处理穿透逻辑
        if (piercing && pierceCount < maxPierceCount)
        {
            pierceCount++;
            return; // 继续飞行
        }

        // 销毁投射物
        Destroy(gameObject);
    }
}

/// <summary>
/// 远程攻击组件
///
/// 处理投射物的生成和发射。
/// 支持：
/// - 直线射击
/// - 抛物线射击
/// - 多方向散射
/// - 蓄力射击
/// </summary>
public class ProjectileAttack : MonoBehaviour
{
    [Header("投射物设置")]
    [Tooltip("投射物预制体")]
    [SerializeField] private GameObject projectilePrefab;

    [Tooltip("发射点 Transform")]
    [SerializeField] private Transform firePoint;

    [Tooltip("基础伤害")]
    [SerializeField] private float baseDamage = 15f;

    [Tooltip("投射物速度")]
    [SerializeField] private float projectileSpeed = 20f;

    [Header("攻击设置")]
    [Tooltip("攻击按键")]
    [SerializeField] private KeyCode fireKey = KeyCode.Mouse1;

    [Tooltip("攻击冷却时间")]
    [SerializeField] private float fireCooldown = 0.5f;

    [Tooltip("可攻击的层")]
    [SerializeField] private LayerMask attackableLayers;

    [Header("蓄力设置")]
    [Tooltip("是否启用蓄力")]
    [SerializeField] private bool enableCharging = false;

    [Tooltip("最大蓄力时间（秒）")]
    [SerializeField] private float maxChargeTime = 2f;

    [Tooltip("最大蓄力伤害倍率")]
    [SerializeField] private float maxChargeDamageMultiplier = 3f;

    [Header("音效")]
    [Tooltip("发射音效")]
    [SerializeField] private AudioClip fireSound;

    // ========== 内部状态 ==========

    /// <summary>冷却计时器</summary>
    private float cooldownTimer = 0f;

    /// <summary>当前蓄力时间</summary>
    private float currentChargeTime = 0f;

    /// <summary>是否正在蓄力</summary>
    private bool isCharging = false;

    /// <summary>音效播放器</summary>
    private AudioSource audioSource;

    private void Awake()
    {
        audioSource = GetComponent<AudioSource>();

        // 如果没有指定发射点，使用自身位置
        if (firePoint == null)
            firePoint = transform;
    }

    private void Update()
    {
        // 冷却倒计时
        if (cooldownTimer > 0)
            cooldownTimer -= Time.deltaTime;

        if (enableCharging)
        {
            HandleChargingInput();
        }
        else
        {
            HandleNormalInput();
        }
    }

    /// <summary>
    /// 处理普通射击输入
    /// </summary>
    private void HandleNormalInput()
    {
        if (Input.GetKeyDown(fireKey) && cooldownTimer <= 0)
        {
            Fire(1f);
        }
    }

    /// <summary>
    /// 处理蓄力射击输入
    /// </summary>
    private void HandleChargingInput()
    {
        // 按住开始蓄力
        if (Input.GetKey(fireKey) && cooldownTimer <= 0)
        {
            if (!isCharging)
            {
                isCharging = true;
                currentChargeTime = 0f;
            }

            currentChargeTime = Mathf.Min(currentChargeTime + Time.deltaTime, maxChargeTime);
        }

        // 松开发射
        if (Input.GetKeyUp(fireKey) && isCharging)
        {
            float chargePercent = currentChargeTime / maxChargeTime;
            float damageMultiplier = 1f + (maxChargeDamageMultiplier - 1f) * chargePercent;

            Fire(damageMultiplier);

            isCharging = false;
            currentChargeTime = 0f;
        }
    }

    /// <summary>
    /// 发射投射物
    /// </summary>
    /// <param name="damageMultiplier">伤害倍率</param>
    private void Fire(float damageMultiplier)
    {
        if (projectilePrefab == null) return;

        // 计算发射方向（可以加入瞄准系统的方向）
        Vector3 fireDirection = firePoint.forward;

        // 创建投射物
        GameObject projObj = Instantiate(
            projectilePrefab,
            firePoint.position,
            Quaternion.LookRotation(fireDirection)
        );

        // 设置投射物参数
        Projectile projectile = projObj.GetComponent<Projectile>();
        if (projectile != null)
        {
            projectile.speed = projectileSpeed;
            projectile.owner = gameObject;
            projectile.attackableLayers = attackableLayers;

            // 计算伤害信息
            projectile.damageInfo = CombatManager.Instance != null
                ? CombatManager.Instance.CalculateDamage(
                    baseDamage * damageMultiplier,
                    gameObject,
                    firePoint.position,
                    fireDirection,
                    DamageType.Physical,
                    3f)
                : new DamageInfo
                {
                    baseDamage = baseDamage * damageMultiplier,
                    finalDamage = baseDamage * damageMultiplier,
                    source = gameObject,
                    hitDirection = fireDirection,
                    damageType = DamageType.Physical,
                    knockbackForce = 3f
                };
        }

        // 播放音效
        if (fireSound != null && audioSource != null)
        {
            audioSource.PlayOneShot(fireSound);
        }

        // 设置冷却
        cooldownTimer = fireCooldown;

        Debug.Log($"[ProjectileAttack] 发射投射物，伤害: " +
                  $"{baseDamage * damageMultiplier:F0}");
    }
}
```

[截图：投射物预制体的设置，展示 Projectile 组件和 Collider 配置]

---

## 14.6 战斗管理器与伤害计算

```csharp
// CombatManager.cs
// 战斗管理器 - 集中管理伤害计算、特效反馈
// 单例模式，提供全局战斗相关功能

using System.Collections;
using UnityEngine;

/// <summary>
/// 战斗管理器 - 单例模式
///
/// 核心功能：
/// 1. 伤害计算公式（基础伤害 × 倍率 - 防御 × 暴击）
/// 2. 打击感反馈（顿帧、屏幕震动）
/// 3. 伤害数字弹出
/// 4. 战斗状态管理
///
/// 伤害计算流程：
/// 基础伤害 → 攻击力加成 → 暴击判定 → 防御减免 → 最终伤害
/// </summary>
public class CombatManager : MonoBehaviour
{
    // ========== 单例 ==========
    public static CombatManager Instance { get; private set; }

    [Header("伤害计算参数")]
    [Tooltip("防御力减免系数（伤害 = 攻击 × (100 / (100 + 防御))）")]
    [SerializeField] private float defenseScaling = 100f;

    [Tooltip("暴击伤害倍率")]
    [SerializeField] private float criticalDamageMultiplier = 2f;

    [Tooltip("最小伤害值（确保至少造成一定伤害）")]
    [SerializeField] private float minimumDamage = 1f;

    [Header("打击感设置")]
    [Tooltip("默认顿帧时长（秒）")]
    [SerializeField] private float defaultHitStopDuration = 0.05f;

    [Tooltip("默认屏幕震动强度")]
    [SerializeField] private float defaultShakeIntensity = 0.2f;

    [Header("伤害数字")]
    [Tooltip("伤害数字弹出预制体")]
    [SerializeField] private GameObject damagePopupPrefab;

    // ========== 内部状态 ==========

    /// <summary>主摄像机引用（用于屏幕震动）</summary>
    private Camera mainCamera;

    /// <summary>摄像机原始位置</summary>
    private Vector3 cameraOriginalPos;

    /// <summary>是否正在顿帧</summary>
    private bool isHitStopping = false;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;

        mainCamera = Camera.main;
    }

    // ========== 伤害计算 ==========

    /// <summary>
    /// 计算伤害
    ///
    /// 公式：
    /// 最终伤害 = 基础伤害 × (100 / (100 + 目标防御力)) × 暴击倍率
    ///
    /// 这是一个经典的 ARPG 伤害公式：
    /// - 防御力提供递减收益（diminishing returns）
    /// - 100 防御力减少 50% 伤害，200 防御力减少 66.7% 伤害
    /// - 这样防御力永远不会让伤害变为 0
    /// </summary>
    /// <param name="baseDamage">基础伤害值</param>
    /// <param name="source">攻击源 GameObject</param>
    /// <param name="hitPoint">命中点</param>
    /// <param name="hitDirection">命中方向</param>
    /// <param name="damageType">伤害类型</param>
    /// <param name="knockbackForce">击退力度</param>
    /// <returns>完整的伤害信息</returns>
    public DamageInfo CalculateDamage(
        float baseDamage,
        GameObject source,
        Vector3 hitPoint,
        Vector3 hitDirection,
        DamageType damageType,
        float knockbackForce = 5f)
    {
        DamageInfo info = new DamageInfo
        {
            baseDamage = baseDamage,
            source = source,
            hitPoint = hitPoint,
            hitDirection = hitDirection,
            damageType = damageType,
            knockbackForce = knockbackForce
        };

        // 获取攻击者的额外属性加成
        float totalDamage = baseDamage;

        // 从装备系统获取攻击力加成
        if (EquipmentManager.Instance != null && source != null &&
            source.CompareTag("Player"))
        {
            totalDamage += EquipmentManager.Instance.GetTotalAttack();
        }

        // 暴击判定
        float critChance = 0.1f; // 默认 10% 暴击率
        if (EquipmentManager.Instance != null && source != null &&
            source.CompareTag("Player"))
        {
            critChance += EquipmentManager.Instance.GetTotalCritChance();
        }

        info.isCritical = Random.value < critChance;
        if (info.isCritical)
        {
            totalDamage *= criticalDamageMultiplier;
        }

        // 最终伤害（防御减免在 target 端处理，这里先设为计算后的攻击值）
        info.finalDamage = Mathf.Max(totalDamage, minimumDamage);

        return info;
    }

    /// <summary>
    /// 应用防御减免
    /// 通常由 HealthComponent 在 TakeDamage 前调用
    /// </summary>
    /// <param name="rawDamage">原始伤害</param>
    /// <param name="defense">目标防御力</param>
    /// <returns>减免后的伤害</returns>
    public float ApplyDefenseReduction(float rawDamage, float defense)
    {
        // 公式：damage × (scaling / (scaling + defense))
        float reduction = defenseScaling / (defenseScaling + defense);
        return Mathf.Max(rawDamage * reduction, minimumDamage);
    }

    // ========== 顿帧效果（Hit Stop / Freeze Frame） ==========

    /// <summary>
    /// 请求顿帧效果
    ///
    /// 顿帧是动作游戏中非常重要的打击感反馈。
    /// 当攻击命中时，游戏短暂暂停（0.03-0.1秒），
    /// 让玩家"感受"到命中的力度。
    ///
    /// 实现原理：
    /// 通过 Time.timeScale 暂停游戏时间，
    /// 然后用 WaitForSecondsRealtime 计时恢复。
    /// </summary>
    /// <param name="duration">顿帧时长（秒）</param>
    public void RequestHitStop(float duration = -1f)
    {
        if (isHitStopping) return;

        float stopDuration = duration > 0 ? duration : defaultHitStopDuration;
        StartCoroutine(HitStopCoroutine(stopDuration));
    }

    private IEnumerator HitStopCoroutine(float duration)
    {
        isHitStopping = true;

        // 暂停游戏时间
        float originalTimeScale = Time.timeScale;
        Time.timeScale = 0.02f; // 几乎暂停

        // 使用真实时间等待（不受 timeScale 影响）
        yield return new WaitForSecondsRealtime(duration);

        // 恢复时间
        Time.timeScale = originalTimeScale;
        isHitStopping = false;
    }

    // ========== 屏幕震动 ==========

    /// <summary>
    /// 请求屏幕震动
    ///
    /// 通过快速随机偏移摄像机位置来实现震动效果。
    /// 这是增强打击感的另一个重要手段。
    /// </summary>
    /// <param name="duration">震动持续时间</param>
    /// <param name="intensity">震动强度</param>
    public void RequestScreenShake(float duration = -1f, float intensity = -1f)
    {
        if (mainCamera == null) return;

        float shakeDuration = duration > 0 ? duration : 0.15f;
        float shakeIntensity = intensity > 0 ? intensity : defaultShakeIntensity;

        StartCoroutine(ScreenShakeCoroutine(shakeDuration, shakeIntensity));
    }

    private IEnumerator ScreenShakeCoroutine(float duration, float intensity)
    {
        Vector3 originalPos = mainCamera.transform.localPosition;
        float elapsed = 0f;

        while (elapsed < duration)
        {
            // 随机偏移
            float x = Random.Range(-1f, 1f) * intensity;
            float y = Random.Range(-1f, 1f) * intensity;

            mainCamera.transform.localPosition = originalPos + new Vector3(x, y, 0);

            // 强度随时间衰减
            intensity *= 0.95f;

            elapsed += Time.unscaledDeltaTime;
            yield return null;
        }

        // 恢复位置
        mainCamera.transform.localPosition = originalPos;
    }

    // ========== 伤害数字弹出 ==========

    /// <summary>
    /// 在指定位置生成伤害数字
    /// </summary>
    /// <param name="position">世界坐标位置</param>
    /// <param name="damage">伤害值</param>
    /// <param name="isCritical">是否暴击</param>
    public void SpawnDamagePopup(Vector3 position, float damage, bool isCritical)
    {
        if (damagePopupPrefab == null) return;

        GameObject popup = Instantiate(
            damagePopupPrefab,
            position + Vector3.up * 2f, // 稍微偏上
            Quaternion.identity
        );

        DamagePopup popupScript = popup.GetComponent<DamagePopup>();
        if (popupScript != null)
        {
            popupScript.Setup(damage, isCritical);
        }
    }
}
```

---

## 14.7 伤害数字弹出

```csharp
// DamagePopup.cs
// 伤害数字弹出效果 - 显示漂浮的伤害数字
// 数字向上飘动并淡出，暴击数字更大更醒目

using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// 伤害数字弹出组件
///
/// 挂载到一个 World Space Canvas 的预制体上。
/// 包含一个 Text 组件用于显示数字。
///
/// 预制体结构：
/// DamagePopup (Canvas - World Space)
/// └─ DamageText (Text 组件)
///
/// 前端类比：
/// 类似于一个 CSS animation：
/// @keyframes floatUp {
///     from { opacity: 1; transform: translateY(0); }
///     to { opacity: 0; transform: translateY(-50px); }
/// }
/// </summary>
public class DamagePopup : MonoBehaviour
{
    [Header("设置")]
    [Tooltip("伤害数字文本组件")]
    [SerializeField] private Text damageText;

    [Tooltip("上飘速度")]
    [SerializeField] private float floatSpeed = 1.5f;

    [Tooltip("显示持续时间")]
    [SerializeField] private float lifetime = 1f;

    [Tooltip("淡出开始时间（占总时间的比例）")]
    [SerializeField] private float fadeStartPercent = 0.5f;

    [Header("普通伤害样式")]
    [Tooltip("普通伤害文字颜色")]
    [SerializeField] private Color normalColor = Color.white;

    [Tooltip("普通伤害字体大小")]
    [SerializeField] private int normalFontSize = 36;

    [Header("暴击样式")]
    [Tooltip("暴击伤害文字颜色")]
    [SerializeField] private Color criticalColor = Color.red;

    [Tooltip("暴击字体大小")]
    [SerializeField] private int criticalFontSize = 52;

    // ========== 内部状态 ==========

    /// <summary>已存活时间</summary>
    private float timer = 0f;

    /// <summary>随机水平偏移（避免多个数字重叠）</summary>
    private float randomOffsetX;

    /// <summary>初始缩放（暴击会放大）</summary>
    private Vector3 startScale;

    // ========== 初始化 ==========

    /// <summary>
    /// 设置伤害数字的显示参数
    /// </summary>
    /// <param name="damage">伤害值</param>
    /// <param name="isCritical">是否暴击</param>
    public void Setup(float damage, bool isCritical)
    {
        if (damageText == null)
            damageText = GetComponentInChildren<Text>();

        if (damageText == null)
        {
            Debug.LogWarning("[DamagePopup] 找不到 Text 组件");
            Destroy(gameObject);
            return;
        }

        // 设置文字
        damageText.text = Mathf.RoundToInt(damage).ToString();

        if (isCritical)
        {
            // 暴击样式
            damageText.color = criticalColor;
            damageText.fontSize = criticalFontSize;
            damageText.text = damage.ToString("F0") + "!";
            transform.localScale = Vector3.one * 1.5f;
        }
        else
        {
            // 普通样式
            damageText.color = normalColor;
            damageText.fontSize = normalFontSize;
            transform.localScale = Vector3.one;
        }

        startScale = transform.localScale;

        // 随机水平偏移
        randomOffsetX = Random.Range(-0.5f, 0.5f);

        // 确保面朝摄像机
        if (Camera.main != null)
        {
            transform.rotation = Camera.main.transform.rotation;
        }
    }

    // ========== 生命周期 ==========

    private void Update()
    {
        timer += Time.deltaTime;

        // 上飘 + 水平偏移
        transform.position += new Vector3(
            randomOffsetX * Time.deltaTime,
            floatSpeed * Time.deltaTime,
            0
        );

        // 始终面朝摄像机
        if (Camera.main != null)
        {
            transform.rotation = Camera.main.transform.rotation;
        }

        // 淡出效果
        float normalizedTime = timer / lifetime;
        if (normalizedTime > fadeStartPercent)
        {
            float fadeProgress = (normalizedTime - fadeStartPercent) / (1f - fadeStartPercent);

            // 透明度
            if (damageText != null)
            {
                Color c = damageText.color;
                c.a = 1f - fadeProgress;
                damageText.color = c;
            }

            // 缩小
            transform.localScale = startScale * (1f - fadeProgress * 0.3f);
        }

        // 销毁
        if (timer >= lifetime)
        {
            Destroy(gameObject);
        }
    }
}
```

[截图：运行时的伤害数字弹出效果，展示普通白色数字和红色暴击数字]

---

## 14.8 敌人 AI 状态机

```csharp
// EnemyAI.cs
// 敌人 AI - 基于状态机的敌人行为控制
// 状态：空闲 → 巡逻 → 追击 → 攻击 → 逃跑 → 死亡

using UnityEngine;
using UnityEngine.AI;

/// <summary>
/// 敌人 AI 状态枚举
/// </summary>
public enum EnemyState
{
    /// <summary>空闲 - 原地站立</summary>
    Idle,

    /// <summary>巡逻 - 在预设路径上移动</summary>
    Patrol,

    /// <summary>追击 - 发现玩家，追踪目标</summary>
    Chase,

    /// <summary>攻击 - 进入攻击距离，发起攻击</summary>
    Attack,

    /// <summary>逃跑 - 血量过低时远离玩家</summary>
    Flee,

    /// <summary>死亡 - 播放死亡动画</summary>
    Dead
}

/// <summary>
/// 敌人 AI 组件
///
/// 这是一个基于状态机（Finite State Machine, FSM）的 AI 系统。
///
/// 前端类比：
/// 类似于一个路由系统或状态管理器：
/// - 每个状态 = 一个页面/视图
/// - 状态转换 = 路由导航
/// - 条件 = 路由守卫
///
/// 也类似于 JavaScript 的 XState 状态机库：
/// const enemyMachine = createMachine({
///   initial: 'idle',
///   states: {
///     idle: { on: { SPOT_PLAYER: 'chase', PATROL_TIMER: 'patrol' } },
///     patrol: { on: { SPOT_PLAYER: 'chase' } },
///     chase: { on: { IN_RANGE: 'attack', LOST_PLAYER: 'patrol' } },
///     attack: { on: { OUT_OF_RANGE: 'chase', LOW_HEALTH: 'flee' } },
///     ...
///   }
/// });
///
/// 状态转换图：
///
///  ┌──────┐  超时  ┌────────┐
///  │ Idle │──────→│ Patrol │
///  └──┬───┘       └───┬────┘
///     │ 发现玩家       │ 发现玩家
///     ▼               ▼
///  ┌──────┐  进入范围  ┌────────┐
///  │Chase │──────────→│ Attack │
///  └──┬───┘           └───┬────┘
///     │ 丢失目标          │ 血量低
///     ▼                   ▼
///  ┌────────┐          ┌──────┐
///  │ Patrol │          │ Flee │
///  └────────┘          └──────┘
/// </summary>
[RequireComponent(typeof(HealthComponent))]
public class EnemyAI : MonoBehaviour
{
    // ========== 配置 ==========

    [Header("检测设置")]
    [Tooltip("玩家检测距离")]
    [SerializeField] private float detectionRange = 15f;

    [Tooltip("丢失玩家的距离（大于检测距离）")]
    [SerializeField] private float loseTargetRange = 20f;

    [Tooltip("检测玩家的层")]
    [SerializeField] private LayerMask playerLayer;

    [Tooltip("视野角度（正前方多少度）")]
    [Range(0, 360)]
    [SerializeField] private float fieldOfView = 120f;

    [Header("移动设置")]
    [Tooltip("巡逻速度")]
    [SerializeField] private float patrolSpeed = 2f;

    [Tooltip("追击速度")]
    [SerializeField] private float chaseSpeed = 5f;

    [Tooltip("逃跑速度")]
    [SerializeField] private float fleeSpeed = 4f;

    [Header("攻击设置")]
    [Tooltip("攻击距离")]
    [SerializeField] private float attackRange = 2.5f;

    [Tooltip("攻击冷却时间")]
    [SerializeField] private float attackCooldown = 2f;

    [Tooltip("攻击伤害")]
    [SerializeField] private float attackDamage = 10f;

    [Header("行为设置")]
    [Tooltip("空闲状态持续时间")]
    [SerializeField] private float idleDuration = 3f;

    [Tooltip("逃跑血量阈值（百分比）")]
    [Range(0, 1)]
    [SerializeField] private float fleeHealthThreshold = 0.2f;

    [Header("巡逻路径")]
    [Tooltip("巡逻路径点列表")]
    [SerializeField] private Transform[] patrolPoints;

    [Header("掉落")]
    [Tooltip("死亡时掉落的物品")]
    [SerializeField] private ItemData[] dropItems;

    // ========== 状态 ==========

    /// <summary>当前 AI 状态</summary>
    public EnemyState CurrentState { get; private set; } = EnemyState.Idle;

    /// <summary>当前追踪目标</summary>
    private Transform target;

    /// <summary>NavMeshAgent 组件</summary>
    private NavMeshAgent agent;

    /// <summary>Animator 组件</summary>
    private Animator animator;

    /// <summary>HealthComponent 组件</summary>
    private HealthComponent health;

    /// <summary>近战攻击组件</summary>
    private MeleeAttack meleeAttack;

    /// <summary>状态计时器</summary>
    private float stateTimer = 0f;

    /// <summary>攻击冷却计时器</summary>
    private float attackTimer = 0f;

    /// <summary>当前巡逻路径点索引</summary>
    private int currentPatrolIndex = 0;

    /// <summary>初始位置（用于没有巡逻点时的返回点）</summary>
    private Vector3 startPosition;

    // ========== 生命周期 ==========

    private void Start()
    {
        agent = GetComponent<NavMeshAgent>();
        animator = GetComponent<Animator>();
        health = GetComponent<HealthComponent>();
        meleeAttack = GetComponent<MeleeAttack>();
        startPosition = transform.position;

        // 监听死亡事件
        if (health != null)
        {
            health.OnDeath += OnDeath;
            health.OnDamaged += OnDamaged;
        }

        // 初始化状态
        TransitionTo(EnemyState.Idle);
    }

    private void Update()
    {
        if (CurrentState == EnemyState.Dead) return;

        // 更新攻击冷却
        if (attackTimer > 0)
            attackTimer -= Time.deltaTime;

        // 更新状态计时器
        stateTimer += Time.deltaTime;

        // 执行当前状态的逻辑
        switch (CurrentState)
        {
            case EnemyState.Idle:
                UpdateIdle();
                break;
            case EnemyState.Patrol:
                UpdatePatrol();
                break;
            case EnemyState.Chase:
                UpdateChase();
                break;
            case EnemyState.Attack:
                UpdateAttack();
                break;
            case EnemyState.Flee:
                UpdateFlee();
                break;
        }

        // 更新动画参数
        UpdateAnimator();
    }

    // ========== 状态切换 ==========

    /// <summary>
    /// 切换到新状态
    /// </summary>
    /// <param name="newState">目标状态</param>
    private void TransitionTo(EnemyState newState)
    {
        if (CurrentState == newState) return;

        // 退出当前状态
        ExitState(CurrentState);

        EnemyState previousState = CurrentState;
        CurrentState = newState;
        stateTimer = 0f;

        // 进入新状态
        EnterState(newState);

        Debug.Log($"[EnemyAI] {gameObject.name}: {previousState} → {newState}");
    }

    /// <summary>进入状态时的初始化</summary>
    private void EnterState(EnemyState state)
    {
        switch (state)
        {
            case EnemyState.Idle:
                if (agent != null) agent.isStopped = true;
                break;

            case EnemyState.Patrol:
                if (agent != null)
                {
                    agent.isStopped = false;
                    agent.speed = patrolSpeed;
                    SetNextPatrolDestination();
                }
                break;

            case EnemyState.Chase:
                if (agent != null)
                {
                    agent.isStopped = false;
                    agent.speed = chaseSpeed;
                }
                break;

            case EnemyState.Attack:
                if (agent != null) agent.isStopped = true;
                break;

            case EnemyState.Flee:
                if (agent != null)
                {
                    agent.isStopped = false;
                    agent.speed = fleeSpeed;
                }
                break;

            case EnemyState.Dead:
                if (agent != null) agent.isStopped = true;
                break;
        }
    }

    /// <summary>退出状态时的清理</summary>
    private void ExitState(EnemyState state)
    {
        // 可在此处处理状态退出逻辑
    }

    // ========== 各状态的 Update 逻辑 ==========

    /// <summary>空闲状态</summary>
    private void UpdateIdle()
    {
        // 检测玩家
        if (DetectPlayer())
        {
            TransitionTo(EnemyState.Chase);
            return;
        }

        // 超时后转为巡逻
        if (stateTimer >= idleDuration)
        {
            TransitionTo(EnemyState.Patrol);
        }
    }

    /// <summary>巡逻状态</summary>
    private void UpdatePatrol()
    {
        // 检测玩家
        if (DetectPlayer())
        {
            TransitionTo(EnemyState.Chase);
            return;
        }

        // 检查是否到达当前巡逻点
        if (agent != null && !agent.pathPending && agent.remainingDistance <= agent.stoppingDistance)
        {
            // 短暂停留后前往下一个点
            TransitionTo(EnemyState.Idle);
        }
    }

    /// <summary>追击状态</summary>
    private void UpdateChase()
    {
        if (target == null)
        {
            TransitionTo(EnemyState.Patrol);
            return;
        }

        // 检查血量是否需要逃跑
        if (health != null && health.HealthPercent <= fleeHealthThreshold)
        {
            TransitionTo(EnemyState.Flee);
            return;
        }

        float distToTarget = Vector3.Distance(transform.position, target.position);

        // 检查是否丢失目标
        if (distToTarget > loseTargetRange)
        {
            target = null;
            TransitionTo(EnemyState.Patrol);
            return;
        }

        // 检查是否进入攻击范围
        if (distToTarget <= attackRange)
        {
            TransitionTo(EnemyState.Attack);
            return;
        }

        // 追击目标
        if (agent != null)
        {
            agent.SetDestination(target.position);
        }
    }

    /// <summary>攻击状态</summary>
    private void UpdateAttack()
    {
        if (target == null)
        {
            TransitionTo(EnemyState.Idle);
            return;
        }

        float distToTarget = Vector3.Distance(transform.position, target.position);

        // 面朝目标
        FaceTarget();

        // 检查是否超出攻击范围
        if (distToTarget > attackRange * 1.2f)
        {
            TransitionTo(EnemyState.Chase);
            return;
        }

        // 检查血量
        if (health != null && health.HealthPercent <= fleeHealthThreshold)
        {
            TransitionTo(EnemyState.Flee);
            return;
        }

        // 攻击逻辑
        if (attackTimer <= 0)
        {
            PerformAttack();
            attackTimer = attackCooldown;
        }
    }

    /// <summary>逃跑状态</summary>
    private void UpdateFlee()
    {
        if (target == null)
        {
            TransitionTo(EnemyState.Idle);
            return;
        }

        // 计算逃跑方向（远离玩家）
        Vector3 fleeDirection = (transform.position - target.position).normalized;
        Vector3 fleeTarget = transform.position + fleeDirection * 10f;

        if (agent != null)
        {
            agent.SetDestination(fleeTarget);
        }

        // 逃跑足够远后转为巡逻
        float distToTarget = Vector3.Distance(transform.position, target.position);
        if (distToTarget > loseTargetRange)
        {
            target = null;
            TransitionTo(EnemyState.Patrol);
        }
    }

    // ========== 检测与攻击 ==========

    /// <summary>
    /// 检测玩家
    /// 使用 Physics.OverlapSphere + 角度检查
    /// </summary>
    /// <returns>是否检测到玩家</returns>
    private bool DetectPlayer()
    {
        Collider[] colliders = Physics.OverlapSphere(
            transform.position, detectionRange, playerLayer);

        foreach (Collider col in colliders)
        {
            if (!col.CompareTag("Player")) continue;

            // 检查视野角度
            Vector3 dirToPlayer = (col.transform.position - transform.position).normalized;
            float angle = Vector3.Angle(transform.forward, dirToPlayer);

            if (angle <= fieldOfView * 0.5f)
            {
                // 射线检测确认没有遮挡
                RaycastHit hit;
                Vector3 eyePos = transform.position + Vector3.up * 1.5f;
                if (Physics.Raycast(eyePos, dirToPlayer, out hit, detectionRange))
                {
                    if (hit.collider.CompareTag("Player"))
                    {
                        target = col.transform;
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /// <summary>
    /// 执行攻击
    /// </summary>
    private void PerformAttack()
    {
        if (animator != null)
        {
            animator.SetTrigger("Attack");
        }

        // 对目标造成伤害
        if (target != null)
        {
            IDamageable damageable = target.GetComponent<IDamageable>();
            if (damageable != null)
            {
                Vector3 hitDir = (target.position - transform.position).normalized;

                DamageInfo damageInfo = new DamageInfo
                {
                    baseDamage = attackDamage,
                    finalDamage = attackDamage,
                    source = gameObject,
                    hitPoint = target.position,
                    hitDirection = hitDir,
                    damageType = DamageType.Physical,
                    knockbackForce = 3f,
                    isCritical = false
                };

                damageable.TakeDamage(damageInfo);
            }
        }

        Debug.Log($"[EnemyAI] {gameObject.name} 攻击！");
    }

    // ========== 事件回调 ==========

    /// <summary>受伤回调 - 被攻击时可以发现攻击者</summary>
    private void OnDamaged(DamageInfo info, float remainingHealth)
    {
        if (target == null && info.source != null)
        {
            target = info.source.transform;

            if (CurrentState == EnemyState.Idle || CurrentState == EnemyState.Patrol)
            {
                TransitionTo(EnemyState.Chase);
            }
        }
    }

    /// <summary>死亡回调</summary>
    private void OnDeath(DamageInfo killingBlow)
    {
        TransitionTo(EnemyState.Dead);

        if (animator != null)
        {
            animator.SetTrigger("Die");
        }

        // 掉落物品
        DropItems();

        // 禁用 AI
        enabled = false;
    }

    // ========== 辅助方法 ==========

    /// <summary>设置下一个巡逻目标点</summary>
    private void SetNextPatrolDestination()
    {
        if (patrolPoints == null || patrolPoints.Length == 0)
        {
            if (agent != null)
                agent.SetDestination(startPosition);
            return;
        }

        agent.SetDestination(patrolPoints[currentPatrolIndex].position);
        currentPatrolIndex = (currentPatrolIndex + 1) % patrolPoints.Length;
    }

    /// <summary>面朝目标</summary>
    private void FaceTarget()
    {
        if (target == null) return;

        Vector3 dir = (target.position - transform.position).normalized;
        dir.y = 0;
        if (dir.sqrMagnitude > 0.001f)
        {
            Quaternion targetRot = Quaternion.LookRotation(dir);
            transform.rotation = Quaternion.Slerp(transform.rotation, targetRot, 10f * Time.deltaTime);
        }
    }

    /// <summary>更新 Animator 参数</summary>
    private void UpdateAnimator()
    {
        if (animator == null) return;

        float speed = agent != null ? agent.velocity.magnitude : 0f;
        animator.SetFloat("Speed", speed);
        animator.SetBool("IsChasing", CurrentState == EnemyState.Chase);
    }

    /// <summary>掉落物品</summary>
    private void DropItems()
    {
        if (dropItems == null) return;

        foreach (var item in dropItems)
        {
            if (item != null && Random.value < 0.5f) // 50% 掉落概率
            {
                Vector3 dropPos = transform.position + Random.insideUnitSphere * 1.5f;
                dropPos.y = transform.position.y;
                WorldItem.SpawnWorldItem(item, 1, dropPos);
            }
        }
    }

    // ========== Gizmos ==========

    private void OnDrawGizmosSelected()
    {
        // 检测范围
        Gizmos.color = Color.yellow;
        Gizmos.DrawWireSphere(transform.position, detectionRange);

        // 攻击范围
        Gizmos.color = Color.red;
        Gizmos.DrawWireSphere(transform.position, attackRange);

        // 丢失目标范围
        Gizmos.color = new Color(1, 1, 0, 0.2f);
        Gizmos.DrawWireSphere(transform.position, loseTargetRange);

        // 视野扇形
        Gizmos.color = Color.cyan;
        float halfFOV = fieldOfView * 0.5f;
        Vector3 leftDir = Quaternion.Euler(0, -halfFOV, 0) * transform.forward;
        Vector3 rightDir = Quaternion.Euler(0, halfFOV, 0) * transform.forward;
        Gizmos.DrawRay(transform.position, leftDir * detectionRange);
        Gizmos.DrawRay(transform.position, rightDir * detectionRange);
    }
}
```

[截图：敌人 AI 在 Scene 视图中的 Gizmos 可视化，展示检测范围、攻击范围和视野角度]

[截图：EnemyAI 组件在 Inspector 中的配置]

---

## 14.9 死亡与重生系统

```csharp
// RespawnManager.cs
// 重生管理器 - 处理玩家死亡后的重生逻辑

using System.Collections;
using UnityEngine;

/// <summary>
/// 重生管理器
/// 监听玩家死亡事件，显示死亡画面，然后在重生点复活
/// </summary>
public class RespawnManager : MonoBehaviour
{
    public static RespawnManager Instance { get; private set; }

    [Header("重生设置")]
    [Tooltip("重生点 Transform")]
    [SerializeField] private Transform respawnPoint;

    [Tooltip("死亡后等待时间（秒）")]
    [SerializeField] private float respawnDelay = 3f;

    [Tooltip("重生时的生命值百分比")]
    [Range(0.1f, 1f)]
    [SerializeField] private float respawnHealthPercent = 0.5f;

    [Header("UI")]
    [Tooltip("死亡画面 UI")]
    [SerializeField] private GameObject deathScreen;

    [Tooltip("淡入淡出面板")]
    [SerializeField] private CanvasGroup fadePanel;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }

    private void Start()
    {
        // 查找玩家并监听死亡事件
        GameObject player = GameObject.FindGameObjectWithTag("Player");
        if (player != null)
        {
            HealthComponent health = player.GetComponent<HealthComponent>();
            if (health != null)
            {
                health.OnDeath += OnPlayerDeath;
            }
        }

        // 隐藏死亡画面
        if (deathScreen != null)
            deathScreen.SetActive(false);
    }

    /// <summary>
    /// 玩家死亡回调
    /// </summary>
    private void OnPlayerDeath(DamageInfo killingBlow)
    {
        Debug.Log("[Respawn] 玩家死亡");
        StartCoroutine(RespawnSequence());
    }

    /// <summary>
    /// 重生序列协程
    /// </summary>
    private IEnumerator RespawnSequence()
    {
        // 显示死亡画面
        if (deathScreen != null)
            deathScreen.SetActive(true);

        // 淡出
        if (fadePanel != null)
        {
            float timer = 0f;
            while (timer < 1f)
            {
                timer += Time.deltaTime;
                fadePanel.alpha = timer;
                yield return null;
            }
        }

        // 等待
        yield return new WaitForSeconds(respawnDelay);

        // 传送到重生点
        GameObject player = GameObject.FindGameObjectWithTag("Player");
        if (player != null && respawnPoint != null)
        {
            // 禁用角色控制器（避免传送冲突）
            CharacterController cc = player.GetComponent<CharacterController>();
            if (cc != null) cc.enabled = false;

            player.transform.position = respawnPoint.position;
            player.transform.rotation = respawnPoint.rotation;

            if (cc != null) cc.enabled = true;

            // 复活
            HealthComponent health = player.GetComponent<HealthComponent>();
            if (health != null)
            {
                health.Revive(respawnHealthPercent);
            }
        }

        // 淡入
        if (fadePanel != null)
        {
            float timer = 1f;
            while (timer > 0f)
            {
                timer -= Time.deltaTime;
                fadePanel.alpha = timer;
                yield return null;
            }
        }

        // 隐藏死亡画面
        if (deathScreen != null)
            deathScreen.SetActive(false);

        Debug.Log("[Respawn] 玩家已重生");
    }
}
```

---

## 14.10 设置步骤汇总

1. **创建 CombatManager**
   - 空 GameObject → 添加 `CombatManager` 脚本
   - 设置伤害计算参数

2. **配置玩家**
   - 添加 `HealthComponent`（设置血量）
   - 添加 `MeleeAttack`（设置攻击参数和连击序列）
   - 添加 `ProjectileAttack`（可选，远程攻击）
   - 设置 Tag 为 "Player"

3. **配置敌人**
   - 添加 `HealthComponent`
   - 添加 `EnemyAI`
   - 添加 `NavMeshAgent`
   - 设置巡逻路径点
   - 设置检测层

4. **创建特效预制体**
   - 攻击特效（剑光、挥砍轨迹）
   - 命中特效（火花、血液）
   - 死亡特效（爆炸、消散）
   - 伤害数字（World Space Canvas + Text）

5. **设置重生系统**
   - 创建重生点
   - 创建死亡画面 UI
   - 添加 `RespawnManager`

[截图：完整的战斗系统运行截图，展示玩家攻击敌人、伤害数字和血条]

---

## 练习题

### 练习一：实现锁定目标系统
当玩家按下 Tab 键时，锁定最近的敌人。锁定后摄像机保持对准目标，攻击自动朝向目标。

**提示：**
- 使用 Physics.OverlapSphere 查找范围内的敌人
- 按距离排序找到最近的
- 创建一个 `TargetLock` 脚本管理锁定状态
- 修改摄像机控制器，锁定时保持目标在画面中

### 练习二：实现闪避/翻滚机制
按下 Shift 键时玩家向移动方向快速翻滚，翻滚期间无敌。

**提示：**
- 创建 `DodgeRoll` 脚本
- 翻滚时设置 `HealthComponent.IsInvulnerable = true`
- 使用协程控制翻滚距离和时间
- 翻滚期间禁用攻击输入

### 练习三：实现技能冷却系统
创建一个通用的技能冷却管理器，支持多个技能各自的冷却时间和 UI 显示。

**提示：**
- 创建 `AbilityCooldown` 类（技能ID、冷却时间、当前冷却进度）
- 创建 `CooldownManager` 管理所有技能冷却
- UI 上用圆形遮罩（fillAmount）显示冷却进度
- 冷却中的技能按键无效

### 练习四：实现敌人 Boss 战
创建一个 Boss 敌人，有多个攻击模式和阶段（血量低于 50% 时进入狂暴模式）。

**提示：**
- 继承或扩展 `EnemyAI`
- 添加 Boss 特有的攻击模式（范围攻击、冲刺攻击、召唤小怪）
- 在 `OnDamaged` 中检查血量阈值切换阶段
- 狂暴模式下增加攻速和伤害

---

## 下一章预告

在下一章 **第十五章：NavMesh AI 导航** 中，我们将深入学习：

- NavMesh 烘焙（设置可行走表面和障碍物）
- NavMeshAgent 组件（速度、加速度、停止距离）
- NavMeshObstacle 动态障碍物
- NavMesh Areas（不同区域的行走代价）
- Off-Mesh Links（跳跃和攀爬连接）
- AI 巡逻系统（路径点系统）
- AI 追击与逃跑行为的路径规划
- AI 群体行为基础
- 运行时动态 NavMesh
- NavMesh 调试技巧

掌握 NavMesh 导航后，你的游戏中的 AI 角色将能够智能地在复杂地形中移动！
